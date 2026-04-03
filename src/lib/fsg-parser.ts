// FSG PDF parser — uses AI vision to extract expenditure data.
// FSG PDFs use CID-encoded custom fonts; standard text extraction fails.
// The active provider and model are read from system_settings at parse time.

import { prisma } from "@/lib/prisma"

type Provider = "claude" | "openai" | "google"

export type FsgLine = {
  accountCode: string  // function/program code: "1000", "2110", "2540"
  functionDescription?: string
  objectCode: string   // expenditure type: "100", "200", "300", "400", "500", "600"
  objectDescription?: string
  description: string
  currentPeriod: number
  inceptionToDate: number
}

export type FsgParsedData = {
  reportTitle?: string
  grantName?: string
  reportDate?: string
  reportGeneratedAt?: string
  reportGeneratedLabel?: string
  grantValues?: string[]
  lines: FsgLine[]
  totalCurrentPeriod?: number
  totalInceptionToDate?: number
}

const EXTRACTION_PROMPT = `Extract the expenditure data and report metadata from this CPS FSG (Financial Status Grant) report.

This format has specific rules:
- The second column is the function code, which should align with the budget account code (examples: 1000, 2110, 2540, 3000).
- The first column is the function/account description (examples: Instruction, Guidance Services, Operations Maintenance Plant Services).
- The object columns are often shown in the header as small numbers like 1, 2, 3, 4, 5, 6, 7, 8 or as parenthetical numbers. These map to object codes:
  1 => 100 Salaries
  2 => 200 Employee Benefits
  3 => 300 Purchased Services
  4 => 400 Supplies / Materials
  5 => 500 Capital Outlay
  6 => 600 Other Objects
  7 => 700 Transfers
  8 => 800 Tuition
- If the report shows object headers directly as 100, 200, 300, etc., use those exact values.
- Ignore the total column when building line items.
- Build one line for each accountCode + objectCode cell with a non-header amount.

Return a JSON object with this exact structure:
{
  "reportTitle": "full report title shown near the top, if present",
  "grantName": "grant/program name shown near the top, if present",
  "reportDate": "YYYY-MM-DD or the report period string",
  "reportGeneratedAt": "timestamp/date shown near the top for when the report was generated, if present",
  "reportGeneratedLabel": "raw label/value text for the generated/run date area, if present",
  "grantValues": ["list", "of", "grant", "fund", "codes", "if", "shown"],
  "lines": [
    {
      "accountCode": "4-digit function/program code",
      "functionDescription": "function/account description from the first column",
      "objectCode": "3-digit expenditure type code",
      "objectDescription": "object header description such as Salaries or Employee Benefits",
      "description": "object description",
      "currentPeriod": 12345.67,
      "inceptionToDate": 12345.67
    }
  ],
  "totalCurrentPeriod": 12345.67,
  "totalInceptionToDate": 12345.67
}

Rules:
- accountCode: the 4-digit function/program code (e.g. "1000" for Instruction, "2110" for Board of Education, "2540" for Operations)
- functionDescription: the function/program description associated with the accountCode
- objectCode: the 3-digit expenditure type code (e.g. "100" Salaries, "200" Benefits, "300" Purchased Services, "400" Supplies, "500" Capital Outlay, "600" Other, "700" Transfers, "800" Tuition)
- objectDescription: the object header label for that column
- description: set this to the objectDescription so it aligns with budget object descriptions
- currentPeriod: the dollar amount for the current reporting period (may be labeled "This Period", "Current", etc.)
- inceptionToDate: the cumulative amount from grant start (may be labeled "Inception to Date", "Year to Date", etc.)
- Each row in the FSG table represents a unique accountCode + objectCode combination
- The accountCode/function code should align with the budget account code for reconciliation purposes
- All amounts should be numbers without $ or commas
- If a value is blank or zero, use 0
- Return ONLY the JSON object, no other text`

function extractJson(text: string): FsgParsedData {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error("Could not extract JSON from AI response")
  return JSON.parse(match[0]) as FsgParsedData
}

function hasApiKey(provider: Provider): boolean {
  switch (provider) {
    case "claude":
      return Boolean(process.env.ANTHROPIC_API_KEY)
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY)
    case "google":
      return Boolean(process.env.GOOGLE_AI_API_KEY)
  }
}

function defaultModelForProvider(provider: Provider): string {
  switch (provider) {
    case "claude":
      return "claude-opus-4-6"
    case "openai":
      return "gpt-4o"
    case "google":
      return "gemini-2.0-flash"
  }
}

function isModelCompatible(provider: Provider, model: string): boolean {
  switch (provider) {
    case "claude":
      return model.startsWith("claude-")
    case "openai":
      return model.startsWith("gpt-") || model.startsWith("o")
    case "google":
      return model.startsWith("gemini-")
  }
}

function modelForProvider(provider: Provider, configuredModel: string): string {
  return isModelCompatible(provider, configuredModel)
    ? configuredModel
    : defaultModelForProvider(provider)
}

function providerCandidates(primary: Provider): Provider[] {
  const ordered: Provider[] = [primary, "claude", "openai", "google"]
  return [...new Set(ordered)]
}

async function parseClaude(
  pdfBase64: string,
  model: string,
  apiKey: string
): Promise<FsgParsedData> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
            },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    }),
  })

  if (!res.ok) throw new Error(`Claude API error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return extractJson(data.content?.[0]?.text ?? "")
}

async function parseOpenAI(
  pdfBase64: string,
  model: string,
  apiKey: string
): Promise<FsgParsedData> {
  // OpenAI vision requires image format — convert PDF to base64 PNG via data URL
  // For PDF support, use the responses API with file input
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: "fsg.pdf",
              file_data: `data:application/pdf;base64,${pdfBase64}`,
            },
            { type: "input_text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    }),
  })

  if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const text = data.output?.find((o: { type: string }) => o.type === "message")
    ?.content?.find((c: { type: string }) => c.type === "output_text")?.text ?? ""
  return extractJson(text)
}

async function parseGoogle(
  pdfBase64: string,
  model: string,
  apiKey: string
): Promise<FsgParsedData> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
              { text: EXTRACTION_PROMPT },
            ],
          },
        ],
      }),
    }
  )

  if (!res.ok) throw new Error(`Google AI API error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  return extractJson(text)
}

export async function parseFsgPdf(pdfBuffer: Buffer): Promise<FsgParsedData> {
  // Read provider + model from system settings
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ["ai_provider", "ai_model"] } },
  })
  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]))
  const configuredProvider = (settingsMap.ai_provider as Provider | undefined) ?? "claude"
  const configuredModel = settingsMap.ai_model ?? "claude-opus-4-6"

  const pdfBase64 = pdfBuffer.toString("base64")
  const errors: string[] = []

  for (const provider of providerCandidates(configuredProvider)) {
    if (!hasApiKey(provider)) {
      errors.push(`${provider}: missing API key`)
      continue
    }

    const model = modelForProvider(provider, configuredModel)

    try {
      switch (provider) {
        case "claude":
          return await parseClaude(pdfBase64, model, process.env.ANTHROPIC_API_KEY!)
        case "openai":
          return await parseOpenAI(pdfBase64, model, process.env.OPENAI_API_KEY!)
        case "google":
          return await parseGoogle(pdfBase64, model, process.env.GOOGLE_AI_API_KEY!)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${provider}: ${message}`)
    }
  }

  throw new Error(
    `FSG parsing failed for all available AI providers. ${errors.join(" | ")}`
  )
}

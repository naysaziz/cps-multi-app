// FSG PDF parser — uses AI vision to extract expenditure data.
// FSG PDFs use CID-encoded custom fonts; standard text extraction fails.
// The active provider and model are read from system_settings at parse time.

import { prisma } from "@/lib/prisma"

type FsgLine = {
  objectCode: string
  description: string
  currentPeriod: number
  inceptionToDate: number
}

export type FsgParsedData = {
  reportDate?: string
  grantValues?: string[]
  lines: FsgLine[]
  totalCurrentPeriod?: number
  totalInceptionToDate?: number
}

const EXTRACTION_PROMPT = `Extract the expenditure data from this FSG (Financial Status Grant) report.

Return a JSON object with this exact structure:
{
  "reportDate": "YYYY-MM-DD or the report period string",
  "grantValues": ["list", "of", "grant", "fund", "codes", "if", "shown"],
  "lines": [
    {
      "objectCode": "4-digit object code",
      "description": "line item description",
      "currentPeriod": 12345.67,
      "inceptionToDate": 12345.67
    }
  ],
  "totalCurrentPeriod": 12345.67,
  "totalInceptionToDate": 12345.67
}

Rules:
- objectCode: the numeric code for the expenditure category (e.g. "1100", "2200")
- description: the label/name for that expenditure line
- currentPeriod: the dollar amount for the current reporting period (may be labeled "This Period", "Current", etc.)
- inceptionToDate: the cumulative amount from grant start (may be labeled "Inception to Date", "Year to Date", etc.)
- All amounts should be numbers without $ or commas
- If a value is blank or zero, use 0
- Return ONLY the JSON object, no other text`

function extractJson(text: string): FsgParsedData {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error("Could not extract JSON from AI response")
  return JSON.parse(match[0]) as FsgParsedData
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
  const provider = settingsMap.ai_provider ?? "claude"
  const model = settingsMap.ai_model ?? "claude-opus-4-6"

  const pdfBase64 = pdfBuffer.toString("base64")

  switch (provider) {
    case "claude": {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) return { lines: [] }
      return parseClaude(pdfBase64, model, apiKey)
    }
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) return { lines: [] }
      return parseOpenAI(pdfBase64, model, apiKey)
    }
    case "google": {
      const apiKey = process.env.GOOGLE_AI_API_KEY
      if (!apiKey) return { lines: [] }
      return parseGoogle(pdfBase64, model, apiKey)
    }
    default:
      return { lines: [] }
  }
}

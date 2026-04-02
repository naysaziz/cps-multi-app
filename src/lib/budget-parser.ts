// Budget file parser — parses Excel/CSV budget downloads from ISBE Frizz
// Returns normalized line items: objectCode, description, amount

type BudgetLine = {
  objectCode: string
  description: string
  amount: number
}

type BudgetParsedData = {
  lines: BudgetLine[]
  totalAmount: number
}

function parseCSVBudget(text: string): BudgetParsedData {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const dataLines: BudgetLine[] = []

  for (const line of lines) {
    const cells = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim())
    // Expect at least 3 columns: objectCode, description, amount
    if (cells.length < 3) continue

    const objectCode = cells[0]
    const description = cells[1]
    const amountRaw = cells[cells.length - 1].replace(/[$,]/g, "")
    const amount = parseFloat(amountRaw)

    // Skip header rows and non-numeric amounts
    if (!objectCode || isNaN(amount)) continue
    // Skip rows where objectCode isn't numeric (header labels)
    if (!/^\d/.test(objectCode)) continue

    dataLines.push({ objectCode, description, amount })
  }

  const totalAmount = dataLines.reduce((sum, l) => sum + l.amount, 0)
  return { lines: dataLines, totalAmount }
}

export async function parseBudgetFile(
  buffer: Buffer,
  fileName: string
): Promise<BudgetParsedData> {
  // CSV path — parse directly
  if (fileName.endsWith(".csv")) {
    const text = buffer.toString("utf-8")
    return parseCSVBudget(text)
  }

  // Excel path — requires xlsx package (not yet installed)
  // Reject explicitly so the upload fails visibly rather than silently storing empty data.
  // TODO: Install xlsx package (`npm install xlsx`) and implement parseXlsxBudget()
  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    throw new Error(
      "Excel (.xlsx/.xls) parsing is not yet supported. Please export your budget as CSV and re-upload."
    )
  }

  throw new Error("Unsupported file type. Please upload a CSV or Excel file.")
}

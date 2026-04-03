// Budget file parser — parses Excel/CSV budget downloads from ISBE Frizz
// Column structure (ISBE Frizz export):
//   col A (0): status text — ignore
//   col B (1): account description — ignore
//   col C (2): object description with code in parens e.g. "Salaries (100)"
//   col D (3): amount
//   col E (4): accountCode clean number e.g. "1000", "2110"
//   col F (5): objectCode clean number e.g. "100", "200"
//   col G (6): combined "1000-100" — ignore

import * as XLSX from "xlsx"

export type BudgetLine = {
  accountCode: string  // col E: function/program code e.g. "1000", "2110"
  objectCode: string   // col F: expenditure type e.g. "100", "200"
  description: string  // col C stripped of "(NNN)": e.g. "Salaries"
  amount: number       // col D
}

export type BudgetParsedData = {
  lines: BudgetLine[]
  totalAmount: number
}

function pickWorksheet(
  wb: XLSX.WorkBook,
  sheetName?: string | null
): XLSX.WorkSheet {
  if (sheetName) {
    const matched = wb.SheetNames.find((name) => name === sheetName)
    if (!matched) {
      throw new Error(
        `Worksheet "${sheetName}" was not found. Available tabs: ${wb.SheetNames.join(", ")}`
      )
    }

    return wb.Sheets[matched]
  }

  if (wb.SheetNames.length === 1) {
    return wb.Sheets[wb.SheetNames[0]]
  }

  const budgetTab = wb.SheetNames.find((name) => name.toLowerCase() === "budget")
  if (budgetTab) {
    return wb.Sheets[budgetTab]
  }

  throw new Error(
    `This workbook has multiple tabs. Please choose the budget tab before uploading. Available tabs: ${wb.SheetNames.join(", ")}`
  )
}

function stripParens(str: string): string {
  return str.replace(/\s*\([^)]*\)\s*$/, "").trim()
}

function parseCombinedAccountCell(value: string): { accountCode: string; description: string } | null {
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{3,5})\s+(.+)$/)
  if (!match) return null

  return {
    accountCode: match[1],
    description: match[2].trim(),
  }
}

function parseObjectCell(value: string): { objectCode: string; description: string } | null {
  const trimmed = value.trim()
  const match = trimmed.match(/^(.*?)\s*\((\d{3})\)\s*$/)
  if (!match) return null

  return {
    objectCode: match[2],
    description: match[1].trim(),
  }
}

function rowToBudgetLine(cells: (string | number | undefined)[]): BudgetLine | null {
  const amountFrom = (raw: unknown) =>
    typeof raw === "number"
      ? raw
      : parseFloat(String(raw ?? "").replace(/[$,]/g, "").trim())

  const accountCodeRaw = String(cells[4] ?? "").trim()
  const objectCodeRaw = String(cells[5] ?? "").trim()
  const descriptionRaw = String(cells[2] ?? "").trim()
  const amountRaw = cells[3]

  if (/^\d+$/.test(accountCodeRaw) && /^\d+$/.test(objectCodeRaw)) {
    const amount = amountFrom(amountRaw)
    if (isNaN(amount)) return null

    return {
      accountCode: accountCodeRaw,
      objectCode: objectCodeRaw,
      description: stripParens(descriptionRaw),
      amount,
    }
  }

  const combinedAccount = parseCombinedAccountCell(String(cells[1] ?? ""))
  const objectCell = parseObjectCell(String(cells[2] ?? ""))
  const compactAmount = amountFrom(cells[3])

  if (combinedAccount && objectCell && !isNaN(compactAmount)) {
    return {
      accountCode: combinedAccount.accountCode,
      objectCode: objectCell.objectCode,
      description: objectCell.description,
      amount: compactAmount,
    }
  }

  return null
}

function parseCSVBudget(text: string): BudgetParsedData {
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim())
  const dataLines: BudgetLine[] = []

  for (const raw of rawLines) {
    // Handle quoted CSV fields
    const cells: string[] = []
    let current = ""
    let inQuotes = false
    for (const ch of raw) {
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === "," && !inQuotes) {
        cells.push(current.trim())
        current = ""
      } else {
        current += ch
      }
    }
    cells.push(current.trim())

    const line = rowToBudgetLine(cells)
    if (line) dataLines.push(line)
  }

  const totalAmount = dataLines.reduce((sum, l) => sum + l.amount, 0)
  if (dataLines.length === 0) {
    throw new Error("No budget rows were recognized in this file. Please verify the export format.")
  }
  return { lines: dataLines, totalAmount }
}

function parseXlsxBudget(buffer: Buffer, sheetName?: string | null): BudgetParsedData {
  const wb = XLSX.read(buffer, { type: "buffer" })
  const ws = pickWorksheet(wb, sheetName)
  const rows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(ws, { header: 1 })
  const dataLines: BudgetLine[] = []

  for (const row of rows) {
    const line = rowToBudgetLine(row)
    if (line) dataLines.push(line)
  }

  const totalAmount = dataLines.reduce((sum, l) => sum + l.amount, 0)
  if (dataLines.length === 0) {
    throw new Error("No budget rows were recognized in this file. Please verify the selected worksheet.")
  }
  return { lines: dataLines, totalAmount }
}

export async function parseBudgetFile(
  buffer: Buffer,
  fileName: string,
  sheetName?: string | null
): Promise<BudgetParsedData> {
  if (fileName.endsWith(".csv")) {
    const text = buffer.toString("utf-8")
    return parseCSVBudget(text)
  }

  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    return parseXlsxBudget(buffer, sheetName)
  }

  throw new Error("Unsupported file type. Please upload a CSV or Excel file.")
}

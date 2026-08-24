import * as XLSX from 'xlsx'

export type CutExcelRow = {
  quantity: number
  name: string
  length: number
  width: number
}

export type CutExcelSheet = {
  name: string
  rows: CutExcelRow[]
}

const HEADERS = ['Cantidad', 'Pieza', 'Largo', 'Ancho']

function safeName(value: string) {
  return (value || 'Hoja').replace(/[\\/?*\[\]:]/g, ' ').trim().slice(0, 31) || 'Hoja'
}

function numberValue(value: unknown) {
  if (typeof value === 'number') return value
  const parsed = Number(String(value ?? '').replace(',', '.').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function textValue(value: unknown) {
  return String(value ?? '').trim()
}

function getValue(row: Record<string, unknown>, names: string[]) {
  const keys = Object.keys(row)
  const wanted = names.map(n => n.toLowerCase())
  const key = keys.find(k => wanted.includes(k.trim().toLowerCase()))
  return key ? row[key] : undefined
}

export function createBaseCutWorkbook() {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet([
    HEADERS,
    [1, 'PUERTA 2LR 2CR PL', 700, 500],
    [2, 'ENTREPAÑO 2L', 600, 300],
  ])
  worksheet['!cols'] = [{ wch: 12 }, { wch: 36 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Blanco')
  XLSX.writeFile(workbook, 'Maderoom_Plantilla_Cortes.xlsx')
}

export async function readCutWorkbook(file: File): Promise<CutExcelSheet[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })
  const result: CutExcelSheet[] = []

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })
    const rows = raw.map(row => ({
      quantity: Math.max(1, Math.trunc(numberValue(getValue(row, ['Cantidad', 'Cant', 'Qty', 'Quantity'])) || 1)),
      name: textValue(getValue(row, ['Pieza', 'Descripción', 'Descripcion', 'Nombre', 'Piece'])),
      length: numberValue(getValue(row, ['Largo', 'Length', 'Largo (mm)'])),
      width: numberValue(getValue(row, ['Ancho', 'Width', 'Ancho (mm)'])),
    })).filter(row => row.name && row.length > 0 && row.width > 0)

    if (rows.length) result.push({ name: safeName(sheetName), rows })
  }

  return result
}

export function exportCutWorkbook(sheets: Array<{ name: string; rows: CutExcelRow[] }>, filename = 'Maderoom_Cortes.xlsx') {
  const workbook = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const data = sheet.rows.map(row => ({
      Cantidad: row.quantity,
      Pieza: row.name,
      Largo: row.length,
      Ancho: row.width,
    }))
    const worksheet = XLSX.utils.json_to_sheet(data, { header: HEADERS })
    worksheet['!cols'] = [{ wch: 12 }, { wch: 42 }, { wch: 14 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName(sheet.name))
  }
  XLSX.writeFile(workbook, filename)
}

import * as XLSX from 'xlsx'

export type ImportMode = 'headers' | 'positions'
export type ExportScope = 'all' | 'current'
export type ExportField =
  | 'quantity' | 'description' | 'length' | 'width'
  | 'edge_left' | 'edge_right' | 'edge_top' | 'edge_bottom'
  | 'edge1_m' | 'edge2_m' | 'edge3_m'
  | 'hinges' | 'handles' | 'gas_struts' | 'gas_newtons'
  | 'sheet' | 'color'

export type CutTransferConfig = {
  importMode: ImportMode
  importHeaderRow: number
  importColumns: {
    quantity: string
    description: string
    length: string
    width: string
  }
  importPositions: {
    quantity: number
    description: number
    length: number
    width: number
  }
  exportScope: ExportScope
  exportFields: ExportField[]
  exportIncludePieces: boolean
  exportIncludeEdgeSummary: boolean
}

export type TransferPiece = {
  quantity: number
  description: string
  length: number
  width: number
  edge_left?: number | null
  edge_right?: number | null
  edge_top?: number | null
  edge_bottom?: number | null
  hinges?: number
  handles?: number
  gas_struts?: number
  gas_newtons?: number | null
}

export type TransferSheet = {
  name: string
  color?: string | null
  pieces: TransferPiece[]
}

export const DEFAULT_CUT_TRANSFER_CONFIG: CutTransferConfig = {
  importMode: 'headers',
  importHeaderRow: 1,
  importColumns: {
    quantity: 'Cantidad',
    description: 'Pieza',
    length: 'Largo',
    width: 'Ancho',
  },
  importPositions: {
    quantity: 1,
    description: 2,
    length: 3,
    width: 4,
  },
  exportScope: 'all',
  exportFields: ['quantity', 'description', 'length', 'width', 'edge_left', 'edge_right', 'edge_top', 'edge_bottom', 'edge1_m', 'edge2_m', 'edge3_m'],
  exportIncludePieces: true,
  exportIncludeEdgeSummary: true,
}

const STORAGE_KEY = 'maderoom.cut-transfer-config.v1'

export const EXPORT_FIELD_OPTIONS: Array<{ key: ExportField; label: string }> = [
  { key: 'quantity', label: 'Cantidad' },
  { key: 'description', label: 'Descripción' },
  { key: 'length', label: 'Largo' },
  { key: 'width', label: 'Ancho' },
  { key: 'sheet', label: 'Hoja' },
  { key: 'color', label: 'Color' },
  { key: 'edge_left', label: 'Canto izquierdo' },
  { key: 'edge_right', label: 'Canto derecho' },
  { key: 'edge_top', label: 'Canto superior' },
  { key: 'edge_bottom', label: 'Canto inferior' },
  { key: 'edge1_m', label: 'Canto 1 · Flexible (m)' },
  { key: 'edge2_m', label: 'Canto 2 · Rígido (m)' },
  { key: 'edge3_m', label: 'Canto 3 · Rígido engrosado (m)' },
  { key: 'hinges', label: 'Bisagras' },
  { key: 'handles', label: 'Manijas' },
  { key: 'gas_struts', label: 'Gatos' },
  { key: 'gas_newtons', label: 'Presión de gatos (N)' },
]

export function loadCutTransferConfig(): CutTransferConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CUT_TRANSFER_CONFIG
    const value = JSON.parse(raw)
    return {
      ...DEFAULT_CUT_TRANSFER_CONFIG,
      ...value,
      importColumns: { ...DEFAULT_CUT_TRANSFER_CONFIG.importColumns, ...(value.importColumns || {}) },
      importPositions: { ...DEFAULT_CUT_TRANSFER_CONFIG.importPositions, ...(value.importPositions || {}) },
      exportFields: Array.isArray(value.exportFields) ? value.exportFields : DEFAULT_CUT_TRANSFER_CONFIG.exportFields,
    }
  } catch {
    return DEFAULT_CUT_TRANSFER_CONFIG
  }
}

export function saveCutTransferConfig(config: CutTransferConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

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

export async function readConfiguredCutWorkbook(file: File, config: CutTransferConfig) {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })
  const result: Array<{ name: string; rows: Array<{ quantity: number; name: string; length: number; width: number }> }> = []

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' })
    if (!matrix.length) continue

    let rows: Array<{ quantity: number; name: string; length: number; width: number }> = []
    if (config.importMode === 'positions') {
      const start = Math.max(0, (config.importHeaderRow || 1))
      rows = matrix.slice(start).map(row => ({
        quantity: Math.max(1, Math.trunc(numberValue(row[Math.max(0, config.importPositions.quantity - 1)]) || 1)),
        name: textValue(row[Math.max(0, config.importPositions.description - 1)]),
        length: numberValue(row[Math.max(0, config.importPositions.length - 1)]),
        width: numberValue(row[Math.max(0, config.importPositions.width - 1)]),
      })).filter(row => row.name && row.length > 0 && row.width > 0)
    } else {
      const headerIndex = Math.max(0, (config.importHeaderRow || 1) - 1)
      const headers = (matrix[headerIndex] || []).map(v => textValue(v).toLowerCase())
      const find = (name: string) => headers.findIndex(h => h === name.trim().toLowerCase())
      const qi = find(config.importColumns.quantity)
      const di = find(config.importColumns.description)
      const li = find(config.importColumns.length)
      const wi = find(config.importColumns.width)
      rows = matrix.slice(headerIndex + 1).map(row => ({
        quantity: Math.max(1, Math.trunc(numberValue(qi >= 0 ? row[qi] : 1) || 1)),
        name: textValue(di >= 0 ? row[di] : ''),
        length: numberValue(li >= 0 ? row[li] : 0),
        width: numberValue(wi >= 0 ? row[wi] : 0),
      })).filter(row => row.name && row.length > 0 && row.width > 0)
    }
    if (rows.length) result.push({ name: safeName(sheetName), rows })
  }
  return result
}

export function createConfiguredBaseWorkbook(config: CutTransferConfig) {
  const workbook = XLSX.utils.book_new()
  let matrix: unknown[][]
  if (config.importMode === 'positions') {
    const size = Math.max(...Object.values(config.importPositions), 4)
    const headers = Array(size).fill('')
    headers[config.importPositions.quantity - 1] = 'Cantidad'
    headers[config.importPositions.description - 1] = 'Pieza'
    headers[config.importPositions.length - 1] = 'Largo'
    headers[config.importPositions.width - 1] = 'Ancho'
    const sample = Array(size).fill('')
    sample[config.importPositions.quantity - 1] = 1
    sample[config.importPositions.description - 1] = 'PUERTA 2LR 2CR PL'
    sample[config.importPositions.length - 1] = 700
    sample[config.importPositions.width - 1] = 500
    matrix = [headers, sample]
  } else {
    matrix = [[config.importColumns.quantity, config.importColumns.description, config.importColumns.length, config.importColumns.width], [1, 'PUERTA 2LR 2CR PL', 700, 500]]
  }
  const worksheet = XLSX.utils.aoa_to_sheet(matrix)
  worksheet['!cols'] = matrix[0].map((_, i) => ({ wch: i === 1 ? 38 : 16 }))
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Blanco')
  XLSX.writeFile(workbook, 'Maderoom_Plantilla_Cortes_Configurable.xlsx')
}

function edgeMeters(piece: TransferPiece, type: 1 | 2 | 3) {
  let total = 0
  if (piece.edge_left === type) total += piece.length
  if (piece.edge_right === type) total += piece.length
  if (piece.edge_top === type) total += piece.width
  if (piece.edge_bottom === type) total += piece.width
  return total * piece.quantity / 1000
}

function fieldValue(field: ExportField, sheet: TransferSheet, piece: TransferPiece) {
  const map: Record<ExportField, unknown> = {
    quantity: piece.quantity,
    description: piece.description,
    length: piece.length,
    width: piece.width,
    sheet: sheet.name,
    color: sheet.color || sheet.name,
    edge_left: piece.edge_left || '',
    edge_right: piece.edge_right || '',
    edge_top: piece.edge_top || '',
    edge_bottom: piece.edge_bottom || '',
    edge1_m: Number(edgeMeters(piece, 1).toFixed(3)),
    edge2_m: Number(edgeMeters(piece, 2).toFixed(3)),
    edge3_m: Number(edgeMeters(piece, 3).toFixed(3)),
    hinges: piece.hinges || 0,
    handles: piece.handles || 0,
    gas_struts: piece.gas_struts || 0,
    gas_newtons: piece.gas_newtons || '',
  }
  return map[field]
}

export function exportConfiguredCutWorkbook(sheets: TransferSheet[], config: CutTransferConfig, filename = 'Maderoom_Cortes.xlsx') {
  const workbook = XLSX.utils.book_new()
  const labels = new Map(EXPORT_FIELD_OPTIONS.map(x => [x.key, x.label]))

  if (config.exportIncludePieces) {
    for (const sheet of sheets) {
      const rows = sheet.pieces.map(piece => {
        const row: Record<string, unknown> = {}
        for (const field of config.exportFields) row[labels.get(field) || field] = fieldValue(field, sheet, piece)
        return row
      })
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = config.exportFields.map(field => ({ wch: field === 'description' ? 42 : 18 }))
      XLSX.utils.book_append_sheet(workbook, ws, safeName(sheet.name))
    }
  }

  if (config.exportIncludeEdgeSummary) {
    const summary: Array<Record<string, unknown>> = []
    for (const sheet of sheets) {
      const totals = { 1: 0, 2: 0, 3: 0 }
      for (const piece of sheet.pieces) {
        totals[1] += edgeMeters(piece, 1)
        totals[2] += edgeMeters(piece, 2)
        totals[3] += edgeMeters(piece, 3)
      }
      const color = sheet.color || sheet.name
      if (totals[1] > 0) summary.push({ Canto: 1, Tipo: 'Flexible', Color: color, Metros: Number(totals[1].toFixed(3)) })
      if (totals[2] > 0) summary.push({ Canto: 2, Tipo: 'Rígido', Color: color, Metros: Number(totals[2].toFixed(3)) })
      if (totals[3] > 0) summary.push({ Canto: 3, Tipo: 'Rígido engrosado', Color: color, Metros: Number(totals[3].toFixed(3)) })
    }
    const ws = XLSX.utils.json_to_sheet(summary, { header: ['Canto', 'Tipo', 'Color', 'Metros'] })
    ws['!cols'] = [{ wch: 10 }, { wch: 24 }, { wch: 24 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(workbook, ws, 'Resumen Cantos')
  }

  if (!workbook.SheetNames.length) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Sin información seleccionada']]), 'Exportación')
  }
  XLSX.writeFile(workbook, filename)
}

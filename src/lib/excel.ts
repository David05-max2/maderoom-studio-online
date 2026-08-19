import * as XLSX from 'xlsx'
import type { CutPiece, CutSheet } from './data'

export type ImportedCutRow = {
  quantity: number
  name: string
  length_mm: number
  width_mm: number
  thickness_mm: number
  description: string
}

const HEADER_ALIASES: Record<string, string[]> = {
  quantity: ['cantidad', 'cant', 'qty', 'cantidad piezas'],
  name: ['nombre', 'descripcion', 'descripción', 'pieza', 'nombre pieza'],
  length: ['largo', 'length'],
  width: ['ancho', 'width'],
  thickness: ['espesor', 'thickness'],
}

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function findHeader(headers: string[], aliases: string[]) {
  const normalized = headers.map(normalize)
  const index = normalized.findIndex((value) => aliases.includes(value))
  return index >= 0 ? headers[index] : null
}

export async function importCutWorkbook(file: File) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const ignored = new Set(['instrucciones', 'portada', 'notas', 'resumen', 'información', 'informacion'])

  return workbook.SheetNames
    .filter((sheetName) => !ignored.has(normalize(sheetName)))
    .map((sheetName) => {
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      const headers = rows.length ? Object.keys(rows[0]) : []
      const quantityKey = findHeader(headers, HEADER_ALIASES.quantity)
      const nameKey = findHeader(headers, HEADER_ALIASES.name)
      const lengthKey = findHeader(headers, HEADER_ALIASES.length)
      const widthKey = findHeader(headers, HEADER_ALIASES.width)
      const thicknessKey = findHeader(headers, HEADER_ALIASES.thickness)

      if (!nameKey || !lengthKey || !widthKey) {
        return { sheetName, rows: [] as ImportedCutRow[], error: 'Faltan columnas Nombre/Descripción, Largo o Ancho.' }
      }

      const parsed = rows.flatMap((row) => {
        const name = String(row[nameKey] ?? '').trim()
        const length = Number(String(row[lengthKey]).replace(',', '.'))
        const width = Number(String(row[widthKey]).replace(',', '.'))
        if (!name || !Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) return []
        const quantity = quantityKey ? Number(String(row[quantityKey]).replace(',', '.')) || 1 : 1
        const thickness = thicknessKey ? Number(String(row[thicknessKey]).replace(',', '.')) || 15 : 15
        return [{ quantity: Math.max(1, Math.round(quantity)), name, description: name, length_mm: length, width_mm: width, thickness_mm: thickness }]
      })

      return { sheetName, rows: parsed, error: null as string | null }
    })
}

export function exportCutsWorkbook(input: Array<{ sheet: CutSheet; pieces: CutPiece[] }>) {
  const workbook = XLSX.utils.book_new()

  for (const group of input) {
    const data = group.pieces.map((piece) => ({
      Cantidad: piece.quantity,
      Descripción: piece.description || piece.name,
      Largo: piece.length_mm,
      Ancho: piece.width_mm,
      Espesor: piece.thickness_mm,
      Izq: piece.edge_left ?? '',
      Der: piece.edge_right ?? '',
      Sup: piece.edge_top ?? '',
      Inf: piece.edge_bottom ?? '',
      Bisagras: piece.hinge_count,
      Manijas: piece.handle_count,
      Gatos: piece.gas_strut_count,
      'N/Gato': piece.gas_strut_newtons ?? '',
    }))
    const worksheet = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, group.sheet.name.slice(0, 31))
  }

  XLSX.writeFile(workbook, `Cortes_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

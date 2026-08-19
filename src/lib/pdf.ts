import jsPDF from 'jspdf'
import type { BudgetLine, Company, Project, Quotation } from './data'
import type { OptimizedSheet } from '../domain/cutting'

function safeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')
}

export function generateOptimizerPdf(input: {
  company: Company
  project: Project
  sheetName: string
  sheetLength: number
  sheetWidth: number
  kerf: number
  margin: number
  grain: boolean
  results: OptimizedSheet[]
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const equivalent = input.results.reduce((sum, sheet) => sum + (sheet.kind === 'full' ? 1 : 0.5), 0)

  input.results.forEach((sheet, index) => {
    if (index > 0) doc.addPage('a4', 'landscape')
    doc.setFontSize(16)
    doc.text(`${input.company.name} · Optimización de corte`, 14, 15)
    doc.setFontSize(9)
    doc.text(`${input.project.name} · ${input.sheetName} · Lámina ${index + 1}`, 14, 22)
    doc.text(`Formato: ${sheet.length} × ${sheet.width} mm · Disco: ${input.kerf} mm · Margen: ${input.margin} mm · Veta: ${input.grain ? 'Largo' : 'Libre'}`, 14, 28)
    doc.text(`Resultado total: ${equivalent} láminas equivalentes`, 14, 34)

    const x0 = 14
    const y0 = 42
    const maxW = 260
    const maxH = 140
    const scale = Math.min(maxW / sheet.length, maxH / sheet.width)
    const drawW = sheet.length * scale
    const drawH = sheet.width * scale
    doc.setLineWidth(.4)
    doc.rect(x0, y0, drawW, drawH)

    sheet.placements.forEach((piece, pieceIndex) => {
      const w = (piece.rotated ? piece.width : piece.length) * scale
      const h = (piece.rotated ? piece.length : piece.width) * scale
      const x = x0 + piece.x * scale
      const y = y0 + piece.y * scale
      doc.setLineWidth(.2)
      doc.rect(x, y, w, h)
      if (w > 12 && h > 8) {
        doc.setFontSize(6)
        doc.text(`${pieceIndex + 1}. ${piece.label}`.slice(0, 32), x + 1.2, y + 3)
        doc.text(`${piece.length}×${piece.width}`, x + 1.2, y + 6)
      }
    })

    doc.setFontSize(8)
    doc.text(`Aprovechamiento: ${sheet.utilization.toFixed(1)}%`, 14, 192)
  })

  doc.save(`Optimizacion_${safeName(input.project.name)}_${safeName(input.sheetName)}.pdf`)
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: currency === 'COP' ? 0 : 2 }).format(value)
}

export function generateQuotationPdf(input: {
  company: Company
  project: Project
  quotation: Quotation
  lines: BudgetLine[]
  total: number
  clientName?: string
  materialBenefits?: string[]
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 16
  let y = 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(input.company.name, margin, y)
  y += 8
  doc.setFontSize(11)
  doc.text(input.quotation.title || 'Propuesta comercial', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`${input.quotation.number || ''} · ${new Date().toLocaleDateString()}`, pageW - margin, y, { align: 'right' })
  y += 10

  doc.setDrawColor(210)
  doc.line(margin, y, pageW - margin, y)
  y += 8
  doc.setFontSize(9)
  doc.text(`Cliente: ${input.clientName || 'Cliente'}`, margin, y)
  y += 5
  doc.text(`Proyecto: ${input.project.name}`, margin, y)
  y += 5
  if (input.project.description) {
    const desc = doc.splitTextToSize(input.project.description, pageW - margin * 2)
    doc.text(desc, margin, y)
    y += desc.length * 4 + 4
  }

  y += 3
  doc.setFont('helvetica', 'bold')
  doc.text('Alcance comercial', margin, y)
  doc.setFont('helvetica', 'normal')
  y += 7

  const visible = input.lines.filter((line) => line.visible_in_quote)
  visible.forEach((line) => {
    if (y > 260) { doc.addPage(); y = 18 }
    const description = line.commercial_description || line.internal_description
    const subtotal = Number(line.subtotal || line.quantity * line.unit_cost)
    doc.setFontSize(8.5)
    const wrapped = doc.splitTextToSize(description, 125)
    doc.text(wrapped, margin, y)
    doc.text(formatMoney(subtotal, input.quotation.currency_code), pageW - margin, y, { align: 'right' })
    y += Math.max(6, wrapped.length * 4)
  })

  y += 5
  doc.setLineWidth(.4)
  doc.line(120, y, pageW - margin, y)
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('TOTAL', 120, y)
  doc.text(formatMoney(input.total, input.quotation.currency_code), pageW - margin, y, { align: 'right' })
  doc.setFont('helvetica', 'normal')

  const benefits = input.materialBenefits ?? []
  if (benefits.length) {
    y += 15
    if (y > 235) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Beneficios del material', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    y += 7
    benefits.forEach((benefit) => {
      doc.text(`• ${benefit}`, margin, y)
      y += 5
    })
  }

  if (input.quotation.delivery_terms || input.quotation.warranty) {
    y += 8
    if (y > 235) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Condiciones comerciales', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    y += 7
    if (input.quotation.delivery_terms) { doc.text(`Entrega: ${input.quotation.delivery_terms}`, margin, y); y += 6 }
    if (input.quotation.warranty) {
      const warranty = doc.splitTextToSize(`Garantía: ${input.quotation.warranty}`, pageW - margin * 2)
      doc.text(warranty, margin, y)
      y += warranty.length * 4
    }
  }

  doc.addPage()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Aceptación de la propuesta', margin, 28)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Declaro que he revisado y acepto el alcance, valores y condiciones de esta propuesta.', margin, 40)
  doc.line(margin, 85, 95, 85)
  doc.line(115, 85, pageW - margin, 85)
  doc.text('Nombre / Firma del cliente', margin, 91)
  doc.text('Fecha', 115, 91)

  doc.save(`${safeName(input.quotation.number || 'Cotizacion')}_${safeName(input.project.name)}.pdf`)
}

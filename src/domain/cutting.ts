export type EdgeValue = 1 | 2 | 3 | 4 | null

export type ParsedCutCommand = {
  edge_left: EdgeValue
  edge_right: EdgeValue
  edge_top: EdgeValue
  edge_bottom: EdgeValue
  thickened: boolean
  hinge_mode: 'PL' | 'PC' | 'PLG' | null
  hinge_count: number
  handle_count: number
  gas_strut_count: number
  gas_strut_newtons: number | null
}

function containsToken(text: string, token: string) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^A-Z0-9])${escaped}([^A-Z0-9]|$)`, 'i').test(text)
}

export function estimateHinges(sideMm: number) {
  if (sideMm <= 900) return 2
  if (sideMm <= 1500) return 3
  if (sideMm <= 2000) return 4
  if (sideMm <= 2400) return 5
  return 6
}

export function estimateGasStrutNewtons(lengthMm: number, widthMm: number, thicknessMm = 15) {
  const densityKgM3 = 680
  const volumeM3 = (lengthMm / 1000) * (widthMm / 1000) * (thicknessMm / 1000)
  const massKg = volumeM3 * densityKgM3
  const totalForceN = massKg * 9.81 * 1.35
  const perStrut = totalForceN / 2
  const standard = [40, 60, 80, 100, 120, 150, 180, 200, 250]
  return standard.find((value) => value >= perStrut) ?? 250
}

export function parseCutDescription(
  description: string,
  lengthMm: number,
  widthMm: number,
  quantity = 1,
  thicknessMm = 15,
  sheetHasRigidCommands = true,
): ParsedCutCommand {
  const text = description.toUpperCase()
  let edge_left: EdgeValue = null
  let edge_right: EdgeValue = null
  let edge_top: EdgeValue = null
  let edge_bottom: EdgeValue = null

  const thickenedValue: EdgeValue = sheetHasRigidCommands ? 3 : 2

  const commands = [
    ['2LRG', () => { edge_left = thickenedValue; edge_right = thickenedValue }],
    ['1LRG', () => { edge_left = thickenedValue }],
    ['2CRG', () => { edge_top = thickenedValue; edge_bottom = thickenedValue }],
    ['1CRG', () => { edge_top = thickenedValue }],
    ['2LR', () => { edge_left = 2; edge_right = 2 }],
    ['1LR', () => { edge_left = 2 }],
    ['2CR', () => { edge_top = 2; edge_bottom = 2 }],
    ['1CR', () => { edge_top = 2 }],
    ['2L', () => { edge_left = 1; edge_right = 1 }],
    ['1L', () => { edge_left = 1 }],
    ['2C', () => { edge_top = 1; edge_bottom = 1 }],
    ['1C', () => { edge_top = 1 }],
  ] as const

  for (const [token, apply] of commands) {
    if (containsToken(text, token)) apply()
  }

  let hinge_mode: ParsedCutCommand['hinge_mode'] = null
  if (containsToken(text, 'PLG')) hinge_mode = 'PLG'
  else if (containsToken(text, 'PL')) hinge_mode = 'PL'
  else if (containsToken(text, 'PC')) hinge_mode = 'PC'

  const hingeSide = hinge_mode === 'PC' ? widthMm : lengthMm
  const hinge_count = hinge_mode ? estimateHinges(hingeSide) * quantity : 0
  const handle_count = hinge_mode ? quantity : 0
  const gas_strut_count = hinge_mode === 'PLG' ? 2 * quantity : 0
  const gas_strut_newtons = hinge_mode === 'PLG'
    ? estimateGasStrutNewtons(lengthMm, widthMm, thicknessMm)
    : null

  return {
    edge_left,
    edge_right,
    edge_top,
    edge_bottom,
    thickened: /LRG|CRG/i.test(text),
    hinge_mode,
    hinge_count,
    handle_count,
    gas_strut_count,
    gas_strut_newtons,
  }
}

export function sheetUsesRigidCommands(descriptions: string[]) {
  return descriptions.some((value) => /(^|[^A-Z0-9])(1LR|2LR|1CR|2CR)([^A-Z0-9]|$)/i.test(value))
}

export type OptimizerPiece = {
  id: string
  label: string
  length: number
  width: number
  grain: boolean
}

export type Placement = OptimizerPiece & {
  x: number
  y: number
  rotated: boolean
}

export type OptimizedSheet = {
  kind: 'full' | 'half_length' | 'half_width'
  length: number
  width: number
  placements: Placement[]
  usedArea: number
  utilization: number
}

type FreeRect = { x: number; y: number; length: number; width: number }

function canFit(piece: OptimizerPiece, rect: FreeRect, rotate: boolean, kerf: number) {
  const length = rotate ? piece.width : piece.length
  const width = rotate ? piece.length : piece.width
  return length <= rect.length + kerf / 1000 && width <= rect.width + kerf / 1000
}

function packGuillotine(
  pieces: OptimizerPiece[],
  sheetLength: number,
  sheetWidth: number,
  kerf: number,
  margin: number,
): { placements: Placement[]; remaining: OptimizerPiece[] } {
  const usableLength = sheetLength - margin * 2
  const usableWidth = sheetWidth - margin * 2
  const free: FreeRect[] = [{ x: margin, y: margin, length: usableLength, width: usableWidth }]
  const placements: Placement[] = []
  const remaining: OptimizerPiece[] = []

  for (const piece of pieces) {
    let selected = -1
    let rotate = false
    let bestWaste = Number.POSITIVE_INFINITY

    free.forEach((rect, index) => {
      const options = piece.grain ? [false] : [false, true]
      for (const candidateRotate of options) {
        if (!canFit(piece, rect, candidateRotate, kerf)) continue
        const length = candidateRotate ? piece.width : piece.length
        const width = candidateRotate ? piece.length : piece.width
        const waste = rect.length * rect.width - length * width
        if (waste < bestWaste) {
          bestWaste = waste
          selected = index
          rotate = candidateRotate
        }
      }
    })

    if (selected < 0) {
      remaining.push(piece)
      continue
    }

    const rect = free.splice(selected, 1)[0]
    const length = rotate ? piece.width : piece.length
    const width = rotate ? piece.length : piece.width
    placements.push({ ...piece, x: rect.x, y: rect.y, rotated: rotate })

    const rightLength = rect.length - length - kerf
    const bottomWidth = rect.width - width - kerf

    if (rightLength > 1) {
      free.push({ x: rect.x + length + kerf, y: rect.y, length: rightLength, width })
    }
    if (bottomWidth > 1) {
      free.push({ x: rect.x, y: rect.y + width + kerf, length: rect.length, width: bottomWidth })
    }

    free.sort((a, b) => a.length * a.width - b.length * b.width)
  }

  return { placements, remaining }
}

export function optimizeSheets(
  pieces: OptimizerPiece[],
  options: {
    sheetLength: number
    sheetWidth: number
    kerf: number
    margin: number
    allowHalf: boolean
  },
): OptimizedSheet[] {
  const expanded = [...pieces].sort((a, b) => Math.max(b.length, b.width) - Math.max(a.length, a.width))
  const result: OptimizedSheet[] = []
  let remaining = expanded

  while (remaining.length) {
    const candidates: Array<{ kind: OptimizedSheet['kind']; length: number; width: number }> = [
      { kind: 'full', length: options.sheetLength, width: options.sheetWidth },
    ]
    if (options.allowHalf) {
      candidates.push(
        { kind: 'half_length', length: options.sheetLength / 2, width: options.sheetWidth },
        { kind: 'half_width', length: options.sheetLength, width: options.sheetWidth / 2 },
      )
    }

    const attempts = candidates.map((candidate) => {
      const packed = packGuillotine(remaining, candidate.length, candidate.width, options.kerf, options.margin)
      const placedArea = packed.placements.reduce((sum, piece) => sum + piece.length * piece.width, 0)
      return { ...candidate, ...packed, placedArea }
    }).filter((attempt) => attempt.placements.length > 0)

    if (!attempts.length) throw new Error('Hay piezas que no caben en la lámina configurada.')

    attempts.sort((a, b) => {
      const aEquivalent = a.kind === 'full' ? 1 : 0.5
      const bEquivalent = b.kind === 'full' ? 1 : 0.5
      const aScore = a.remaining.length * 1_000_000 + aEquivalent * 100_000 - a.placedArea
      const bScore = b.remaining.length * 1_000_000 + bEquivalent * 100_000 - b.placedArea
      return aScore - bScore
    })

    const best = attempts[0]
    const usableArea = (best.length - options.margin * 2) * (best.width - options.margin * 2)
    result.push({
      kind: best.kind,
      length: best.length,
      width: best.width,
      placements: best.placements,
      usedArea: best.placedArea,
      utilization: usableArea > 0 ? (best.placedArea / usableArea) * 100 : 0,
    })
    remaining = best.remaining
  }

  return result
}

export type EdgeCommand =
  | '1L' | '2L' | '1C' | '2C'
  | '1LR' | '2LR' | '1CR' | '2CR'
  | '1LRG' | '2LRG' | '1CRG' | '2CRG'

export type DoorCommand = 'PL' | 'PC' | 'PLG'

export const EDGE_COMMAND_PRIORITY: EdgeCommand[] = [
  '2LRG', '1LRG', '2CRG', '1CRG',
  '2LR', '1LR', '2CR', '1CR',
  '2L', '1L', '2C', '1C',
]

export const EDGE_RULES: Record<EdgeCommand, { left?: number; right?: number; top?: number; bottom?: number }> = {
  '1L': { left: 1 },
  '2L': { left: 1, right: 1 },
  '1C': { top: 1 },
  '2C': { top: 1, bottom: 1 },
  '1LR': { left: 2 },
  '2LR': { left: 2, right: 2 },
  '1CR': { top: 2 },
  '2CR': { top: 2, bottom: 2 },
  '1LRG': { left: 3 },
  '2LRG': { left: 3, right: 3 },
  '1CRG': { top: 3 },
  '2CRG': { top: 3, bottom: 3 },
}

export const DOOR_RULES: Record<DoorCommand, { hingeSide: 'long' | 'short'; handlePerDoor: number; gasStrutsPerDoor: number }> = {
  PL: { hingeSide: 'long', handlePerDoor: 1, gasStrutsPerDoor: 0 },
  PC: { hingeSide: 'short', handlePerDoor: 1, gasStrutsPerDoor: 0 },
  PLG: { hingeSide: 'long', handlePerDoor: 1, gasStrutsPerDoor: 2 },
}

export const MEASUREMENT_UNITS = ['mm', 'cm', 'm', 'ft', 'in'] as const
export type MeasurementUnit = typeof MEASUREMENT_UNITS[number]

export const CURRENCIES = [
  ['Argentina', 'Peso argentino', 'ARS'],
  ['Bolivia', 'Boliviano', 'BOB'],
  ['Brasil', 'Real brasileño', 'BRL'],
  ['Chile', 'Peso chileno', 'CLP'],
  ['Colombia', 'Peso colombiano', 'COP'],
  ['Costa Rica', 'Colón costarricense', 'CRC'],
  ['Cuba', 'Peso cubano', 'CUP'],
  ['República Dominicana', 'Peso dominicano', 'DOP'],
  ['Ecuador', 'Dólar estadounidense', 'USD'],
  ['El Salvador', 'Dólar estadounidense', 'USD'],
  ['Guatemala', 'Quetzal', 'GTQ'],
  ['Honduras', 'Lempira', 'HNL'],
  ['México', 'Peso mexicano', 'MXN'],
  ['Nicaragua', 'Córdoba', 'NIO'],
  ['Panamá', 'Balboa', 'PAB'],
  ['Panamá', 'Dólar estadounidense', 'USD'],
  ['Paraguay', 'Guaraní', 'PYG'],
  ['Perú', 'Sol', 'PEN'],
  ['Uruguay', 'Peso uruguayo', 'UYU'],
  ['Venezuela', 'Bolívar', 'VES'],
] as const

export const OPTIMIZER_RULES = {
  grainFollowsLength: true,
  supportsGrainlessRotation: true,
  guillotineCuts: true,
  supportsHalfSheets: true,
  sheetPriority: ['optimized', 'manual', 'area-estimate'] as const,
  ranking: ['fewest-equivalent-sheets', 'least-waste', 'fewest-cuts', 'best-reusable-offcuts'] as const,
}

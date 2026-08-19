import { supabase } from './supabase'
import type { OptimizedSheet } from '../domain/cutting'

function client() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

export async function saveOptimizerRun(input: {
  companyId: string
  projectId: string
  cutSheetId: string
  inputHash: string
  config: Record<string, unknown>
  sheets: OptimizedSheet[]
}) {
  const equivalent = input.sheets.reduce((sum, sheet) => sum + (sheet.kind === 'full' ? 1 : 0.5), 0)
  const full = input.sheets.filter((sheet) => sheet.kind === 'full').length
  const half = input.sheets.length - full
  const used = input.sheets.reduce((sum, sheet) => sum + sheet.usedArea, 0)
  const total = input.sheets.reduce((sum, sheet) => sum + sheet.length * sheet.width, 0)
  const utilization = total > 0 ? used / total * 100 : 0

  await client().from('optimizer_runs').update({ status: 'stale' }).eq('cut_sheet_id', input.cutSheetId).eq('status', 'ready')

  const { data: run, error } = await client().from('optimizer_runs').insert({
    company_id: input.companyId,
    project_id: input.projectId,
    cut_sheet_id: input.cutSheetId,
    status: 'ready',
    input_hash: input.inputHash,
    full_sheets: full,
    half_sheets: half,
    equivalent_sheets: equivalent,
    utilization_percent: utilization,
    waste_percent: 100 - utilization,
    config: input.config,
    result: { sheetCount: input.sheets.length },
  }).select('*').single()
  if (error) throw error

  for (let index = 0; index < input.sheets.length; index += 1) {
    const sheet = input.sheets[index]
    const { data: savedSheet, error: sheetError } = await client().from('optimizer_sheets').insert({
      optimizer_run_id: run.id,
      sheet_index: index + 1,
      sheet_kind: sheet.kind,
      length_mm: sheet.length,
      width_mm: sheet.width,
      utilization_percent: sheet.utilization,
      cut_sequence: [],
      leftovers: [],
    }).select('*').single()
    if (sheetError) throw sheetError

    if (sheet.placements.length) {
      const { error: placementError } = await client().from('optimizer_placements').insert(
        sheet.placements.map((piece, pieceIndex) => ({
          optimizer_sheet_id: savedSheet.id,
          cut_piece_id: piece.id.split(':')[0] || null,
          piece_instance: pieceIndex + 1,
          x_mm: piece.x,
          y_mm: piece.y,
          length_mm: piece.rotated ? piece.width : piece.length,
          width_mm: piece.rotated ? piece.length : piece.width,
          rotated: piece.rotated,
          label: piece.label,
        })),
      )
      if (placementError) throw placementError
    }
  }

  return run
}

export async function getLatestOptimizerRuns(projectId: string) {
  const { data, error } = await client()
    .from('optimizer_runs')
    .select('id,cut_sheet_id,status,equivalent_sheets,full_sheets,half_sheets,utilization_percent,waste_percent,created_at')
    .eq('project_id', projectId)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getCompanyLicense(companyId: string) {
  const { data, error } = await client()
    .from('licenses')
    .select('id,license_key,license_type,status,starts_at,expires_at,max_devices,offline_grace_days,notes')
    .eq('company_id', companyId)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

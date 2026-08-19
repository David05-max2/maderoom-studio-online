import { supabase } from './supabase'

export type Company = {
  id: string
  name: string
  currency_code: string
  measurement_unit: string
  decimal_places: number
  country_code: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  city: string | null
}

export type Project = {
  id: string
  company_id: string
  client_id: string | null
  code: string | null
  name: string
  project_type: string | null
  subtype: string | null
  status: string
  description: string | null
  installation_address: string | null
  created_at: string
  updated_at: string
}

export type Client = {
  id: string
  company_id: string
  name: string
  contact_name: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  city: string | null
  address: string | null
}

export type CutSheet = {
  id: string
  project_id: string
  company_id: string
  name: string
  material: string | null
  color: string | null
  thickness_mm: number
  grain_enabled: boolean
  sheet_length_mm: number
  sheet_width_mm: number
  kerf_mm: number
  margin_top_mm: number
  margin_right_mm: number
  margin_bottom_mm: number
  margin_left_mm: number
  half_sheet_mode: string
  sort_order: number
}

export type CutPiece = {
  id: string
  cut_sheet_id: string
  company_id: string
  quantity: number
  name: string
  description: string | null
  length_mm: number
  width_mm: number
  thickness_mm: number
  edge_left: number | null
  edge_right: number | null
  edge_top: number | null
  edge_bottom: number | null
  thickened: boolean
  hinge_mode: string | null
  hinge_type: string | null
  hinge_count: number
  handle_count: number
  gas_strut_count: number
  gas_strut_newtons: number | null
  notes: string | null
  sort_order: number
}

export type CatalogItem = {
  id: string
  company_id: string
  code: string | null
  name: string
  category: string
  unit: string
  price: number
  supplier: string | null
  material: string | null
  color: string | null
  thickness_mm: number | null
  active: boolean
}

export type Budget = {
  id: string
  project_id: string
  company_id: string
  status: string
  pricing_mode: string
  profit_percent: number
  contingency_percent: number
  discount_percent: number
  tax_percent: number
  manual_total: number | null
  currency_code: string
}

export type BudgetSheet = {
  id: string
  budget_id: string
  name: string
  sort_order: number
  active: boolean
}

export type BudgetLine = {
  id: string
  budget_sheet_id: string
  company_id: string
  catalog_item_id: string | null
  code: string | null
  internal_description: string
  commercial_description: string | null
  quantity: number
  unit: string
  unit_cost: number
  subtotal: number | null
  origin: string
  visible_in_quote: boolean
  commercial_group: string | null
}

export type Quotation = {
  id: string
  project_id: string
  company_id: string
  budget_id: string | null
  number: string | null
  title: string
  status: string
  currency_code: string
  valid_until: string | null
  template: string
  delivery_terms: string | null
  warranty: string | null
}

function client() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

export async function getSession() {
  return client().auth.getSession()
}

export async function signIn(email: string, password: string) {
  return client().auth.signInWithPassword({ email, password })
}

export async function signUp(email: string, password: string) {
  return client().auth.signUp({ email, password })
}

export async function signOut() {
  return client().auth.signOut()
}

export function onAuthChange(callback: () => void) {
  return client().auth.onAuthStateChange(() => callback())
}

export async function bootstrapCompany(name = 'Maderoom') {
  const { data, error } = await client().rpc('bootstrap_company', { company_name: name })
  if (error) throw error
  return data as string
}

export async function getCurrentCompany(): Promise<Company | null> {
  const { data: membership, error: memberError } = await client()
    .from('company_members')
    .select('company_id')
    .eq('active', true)
    .limit(1)
    .maybeSingle()
  if (memberError) throw memberError
  if (!membership) return null

  const { data, error } = await client()
    .from('companies')
    .select('*')
    .eq('id', membership.company_id)
    .single()
  if (error) throw error
  return data as Company
}

export async function updateCompany(companyId: string, patch: Partial<Company>) {
  const { data, error } = await client()
    .from('companies')
    .update(patch)
    .eq('id', companyId)
    .select('*')
    .single()
  if (error) throw error
  return data as Company
}

export async function listProjects(companyId: string): Promise<Project[]> {
  const { data, error } = await client()
    .from('projects')
    .select('*')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Project[]
}

export async function createProject(companyId: string, input: Partial<Project> & { name: string }) {
  const { data: auth } = await client().auth.getUser()
  const { data, error } = await client()
    .from('projects')
    .insert({
      company_id: companyId,
      name: input.name,
      code: input.code || null,
      project_type: input.project_type || null,
      subtype: input.subtype || null,
      description: input.description || null,
      installation_address: input.installation_address || null,
      client_id: input.client_id || null,
      created_by: auth.user?.id ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Project
}

export async function updateProject(projectId: string, patch: Partial<Project>) {
  const { data, error } = await client().from('projects').update(patch).eq('id', projectId).select('*').single()
  if (error) throw error
  return data as Project
}

export async function deleteProject(projectId: string) {
  const { error } = await client().from('projects').delete().eq('id', projectId)
  if (error) throw error
}

export async function listClients(companyId: string): Promise<Client[]> {
  const { data, error } = await client().from('clients').select('*').eq('company_id', companyId).order('name')
  if (error) throw error
  return (data ?? []) as Client[]
}

export async function createClient(companyId: string, input: Partial<Client> & { name: string }) {
  const { data, error } = await client().from('clients').insert({ ...input, company_id: companyId }).select('*').single()
  if (error) throw error
  return data as Client
}

export async function listCutSheets(projectId: string): Promise<CutSheet[]> {
  const { data, error } = await client().from('cut_sheets').select('*').eq('project_id', projectId).order('sort_order')
  if (error) throw error
  return (data ?? []) as CutSheet[]
}

export async function createCutSheet(companyId: string, projectId: string, name: string): Promise<CutSheet> {
  const { data, error } = await client().from('cut_sheets').insert({ company_id: companyId, project_id: projectId, name, color: name }).select('*').single()
  if (error) throw error
  return data as CutSheet
}

export async function updateCutSheet(sheetId: string, patch: Partial<CutSheet>) {
  const { data, error } = await client().from('cut_sheets').update(patch).eq('id', sheetId).select('*').single()
  if (error) throw error
  return data as CutSheet
}

export async function listCutPieces(sheetId: string): Promise<CutPiece[]> {
  const { data, error } = await client().from('cut_pieces').select('*').eq('cut_sheet_id', sheetId).order('sort_order')
  if (error) throw error
  return (data ?? []) as CutPiece[]
}

export async function createCutPiece(companyId: string, sheetId: string, input: Partial<CutPiece> & { name: string; length_mm: number; width_mm: number }) {
  const { data, error } = await client().from('cut_pieces').insert({
    company_id: companyId,
    cut_sheet_id: sheetId,
    quantity: input.quantity ?? 1,
    name: input.name,
    description: input.description ?? input.name,
    length_mm: input.length_mm,
    width_mm: input.width_mm,
    thickness_mm: input.thickness_mm ?? 15,
    edge_left: input.edge_left ?? null,
    edge_right: input.edge_right ?? null,
    edge_top: input.edge_top ?? null,
    edge_bottom: input.edge_bottom ?? null,
    thickened: input.thickened ?? false,
    hinge_mode: input.hinge_mode ?? null,
    hinge_type: input.hinge_type ?? null,
    hinge_count: input.hinge_count ?? 0,
    handle_count: input.handle_count ?? 0,
    gas_strut_count: input.gas_strut_count ?? 0,
    gas_strut_newtons: input.gas_strut_newtons ?? null,
  }).select('*').single()
  if (error) throw error
  return data as CutPiece
}

export async function updateCutPiece(pieceId: string, patch: Partial<CutPiece>) {
  const { data, error } = await client().from('cut_pieces').update(patch).eq('id', pieceId).select('*').single()
  if (error) throw error
  return data as CutPiece
}

export async function deleteCutPiece(pieceId: string) {
  const { error } = await client().from('cut_pieces').delete().eq('id', pieceId)
  if (error) throw error
}

export async function listCatalog(companyId: string): Promise<CatalogItem[]> {
  const { data, error } = await client().from('catalog_items').select('*').eq('company_id', companyId).order('category').order('name')
  if (error) throw error
  return (data ?? []) as CatalogItem[]
}

export async function createCatalogItem(companyId: string, input: Partial<CatalogItem> & { name: string }) {
  const { data, error } = await client().from('catalog_items').insert({
    company_id: companyId,
    name: input.name,
    code: input.code || null,
    category: input.category || 'other',
    unit: input.unit || 'unit',
    price: input.price ?? 0,
    supplier: input.supplier || null,
    material: input.material || null,
    color: input.color || null,
    thickness_mm: input.thickness_mm ?? null,
  }).select('*').single()
  if (error) throw error
  return data as CatalogItem
}

export async function ensureBudget(companyId: string, projectId: string, currencyCode: string): Promise<Budget> {
  const existing = await client().from('budgets').select('*').eq('project_id', projectId).maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return existing.data as Budget

  const created = await client().from('budgets').insert({ company_id: companyId, project_id: projectId, currency_code: currencyCode }).select('*').single()
  if (created.error) throw created.error
  const budget = created.data as Budget
  await client().from('budget_sheets').insert([
    { budget_id: budget.id, name: 'Materiales', sort_order: 0 },
    { budget_id: budget.id, name: 'Herrajes', sort_order: 1 },
    { budget_id: budget.id, name: 'Servicios', sort_order: 2 },
    { budget_id: budget.id, name: 'Mano de obra', sort_order: 3 },
    { budget_id: budget.id, name: 'Transporte', sort_order: 4 },
    { budget_id: budget.id, name: 'Otros', sort_order: 5 },
  ])
  return budget
}

export async function listBudgetSheets(budgetId: string): Promise<BudgetSheet[]> {
  const { data, error } = await client().from('budget_sheets').select('*').eq('budget_id', budgetId).order('sort_order')
  if (error) throw error
  return (data ?? []) as BudgetSheet[]
}

export async function listBudgetLines(sheetId: string): Promise<BudgetLine[]> {
  const { data, error } = await client().from('budget_lines').select('*').eq('budget_sheet_id', sheetId).order('sort_order')
  if (error) throw error
  return (data ?? []) as BudgetLine[]
}

export async function createBudgetLine(companyId: string, sheetId: string, input: Partial<BudgetLine> & { internal_description: string }) {
  const { data, error } = await client().from('budget_lines').insert({
    company_id: companyId,
    budget_sheet_id: sheetId,
    internal_description: input.internal_description,
    commercial_description: input.commercial_description || input.internal_description,
    code: input.code || null,
    quantity: input.quantity ?? 1,
    unit: input.unit || 'unit',
    unit_cost: input.unit_cost ?? 0,
    catalog_item_id: input.catalog_item_id || null,
    origin: input.origin || 'manual',
    visible_in_quote: input.visible_in_quote ?? true,
    commercial_group: input.commercial_group || null,
  }).select('*').single()
  if (error) throw error
  return data as BudgetLine
}

export async function updateBudget(budgetId: string, patch: Partial<Budget>) {
  const { data, error } = await client().from('budgets').update(patch).eq('id', budgetId).select('*').single()
  if (error) throw error
  return data as Budget
}

export async function listQuotations(projectId: string): Promise<Quotation[]> {
  const { data, error } = await client().from('quotations').select('*').eq('project_id', projectId).order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Quotation[]
}

export async function createQuotation(companyId: string, projectId: string, budgetId: string | null, currency: string) {
  const number = `COT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
  const validUntil = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
  const { data, error } = await client().from('quotations').insert({
    company_id: companyId,
    project_id: projectId,
    budget_id: budgetId,
    currency_code: currency,
    number,
    valid_until: validUntil,
    title: 'Propuesta comercial',
  }).select('*').single()
  if (error) throw error
  return data as Quotation
}

export async function getDashboardCounts(companyId: string) {
  const [projects, clients, quotes, optimizer] = await Promise.all([
    client().from('projects').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    client().from('clients').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    client().from('quotations').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    client().from('optimizer_runs').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
  ])
  return {
    projects: projects.count ?? 0,
    clients: clients.count ?? 0,
    quotations: quotes.count ?? 0,
    optimizations: optimizer.count ?? 0,
  }
}

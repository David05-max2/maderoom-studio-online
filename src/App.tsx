import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Calculator,
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Moon,
  PackageSearch,
  Plus,
  RefreshCw,
  Settings,
  Sun,
  Trash2,
  Users,
  WandSparkles,
} from 'lucide-react'
import { CURRENCIES, MEASUREMENT_UNITS } from './domain/rules'
import { optimizeSheets, parseCutDescription, sheetUsesRigidCommands, type OptimizedSheet } from './domain/cutting'
import {
  bootstrapCompany,
  createBudgetLine,
  createCatalogItem,
  createClient,
  createCutPiece,
  createCutSheet,
  createProject,
  createQuotation,
  deleteCutPiece,
  ensureBudget,
  getCurrentCompany,
  getDashboardCounts,
  getSession,
  listBudgetLines,
  listBudgetSheets,
  listCatalog,
  listClients,
  listCutPieces,
  listCutSheets,
  listProjects,
  listQuotations,
  onAuthChange,
  signIn,
  signOut,
  signUp,
  updateBudget,
  updateCompany,
  updateCutPiece,
  type Budget,
  type BudgetLine,
  type BudgetSheet,
  type CatalogItem,
  type Client,
  type Company,
  type CutPiece,
  type CutSheet,
  type Project,
  type Quotation,
} from './lib/data'
import { getCompanyLicense, saveOptimizerRun } from './lib/extras'
import { isSupabaseConfigured } from './lib/supabase'

type ModuleId = 'dashboard' | 'projects' | 'cuts' | 'optimizer' | 'budget' | 'quotation' | 'clients' | 'catalog' | 'settings'

const modules = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Proyectos', icon: FolderKanban },
  { id: 'cuts', label: 'Cortes', icon: ClipboardList },
  { id: 'optimizer', label: 'Optimizador', icon: WandSparkles },
  { id: 'budget', label: 'Presupuesto', icon: Calculator },
  { id: 'quotation', label: 'Cotización', icon: FileText },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'catalog', label: 'Catálogo', icon: PackageSearch },
  { id: 'settings', label: 'Configuración', icon: Settings },
] satisfies Array<{ id: ModuleId; label: string; icon: typeof LayoutDashboard }>

function money(value: number, currency = 'COP') {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: currency === 'COP' ? 0 : 2 }).format(value || 0)
}

function Loading({ label = 'Cargando…' }: { label?: string }) {
  return <div className="page-card empty-state"><RefreshCw className="spin" /><h2>{label}</h2></div>
}

function EmptyProject() {
  return <section className="page-card empty-state"><FolderKanban size={34} /><h2>Selecciona un proyecto</h2><p>Elige un proyecto desde Proyectos para trabajar con cortes, optimización, presupuesto y cotización.</p></section>
}

function AuthScreen({ onReady }: { onReady: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('Maderoom')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) throw error
        onReady()
      } else {
        const { data, error } = await signUp(email, password)
        if (error) throw error
        if (data.session) {
          await bootstrapCompany(company)
          onReady()
        } else {
          setMessage('Cuenta creada. Revisa tu correo si Supabase solicita confirmar el email.')
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible continuar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="brand auth-brand"><div className="brand-mark">M</div><div><strong>Maderoom</strong><span>Studio Online</span></div></div>
        <span className="eyebrow">PLATAFORMA COMERCIAL</span>
        <h1>{mode === 'login' ? 'Iniciar sesión' : 'Crear empresa'}</h1>
        <p>Proyectos, cortes, optimización, costos y cotizaciones sincronizados en la nube.</p>
        <form onSubmit={submit} className="stack-form">
          {mode === 'signup' && <label><span>Nombre de empresa</span><input value={company} onChange={(e) => setCompany(e.target.value)} required /></label>}
          <label><span>Correo</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label><span>Contraseña</span><input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button className="primary-button" disabled={busy}>{busy ? 'Procesando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
        </form>
        {message && <div className="notice">{message}</div>}
        <button className="text-button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Crear una cuenta nueva' : 'Ya tengo una cuenta'}</button>
      </section>
    </div>
  )
}

function Dashboard({ company }: { company: Company }) {
  const [counts, setCounts] = useState({ projects: 0, clients: 0, quotations: 0, optimizations: 0 })
  useEffect(() => { getDashboardCounts(company.id).then(setCounts).catch(console.error) }, [company.id])
  const cards = [
    ['Proyectos', counts.projects, 'En la empresa'],
    ['Cotizaciones', counts.quotations, 'Histórico'],
    ['Optimizaciones', counts.optimizations, 'Guardadas'],
    ['Clientes', counts.clients, 'Registrados'],
  ]
  return <div className="stack-xl">
    <div className="hero"><div><span className="eyebrow">{company.name.toUpperCase()}</span><h1>Todo el flujo del proyecto en una sola plataforma.</h1><p>La información ya se guarda en Supabase y está separada por empresa con políticas de seguridad.</p></div></div>
    <div className="metrics-grid">{cards.map(([label, value, detail]) => <article className="metric-card" key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}</div>
    <section className="page-card"><div className="section-heading"><div><span className="eyebrow">FLUJO</span><h2>Cortes → Optimización → Presupuesto → Cotización</h2></div></div><div className="workflow-grid">{[
      ['01','Cortes','Hojas por color, comandos de canto y herrajes automáticos.'],
      ['02','Optimización','Veta por Largo, disco, margen, guillotina y media lámina.'],
      ['03','Presupuesto','Costos editables, hojas independientes y margen comercial.'],
      ['04','Cotización','Propuesta comercial separada de los costos internos.'],
    ].map(([n,t,c]) => <article className="workflow-card" key={n}><span>{n}</span><h3>{t}</h3><p>{c}</p></article>)}</div></section>
  </div>
}

function ProjectsPage({ company, selected, onSelect }: { company: Company; selected: Project | null; onSelect: (project: Project) => void }) {
  const [items, setItems] = useState<Project[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState('Cocina')
  const [busy, setBusy] = useState(false)
  const load = () => listProjects(company.id).then(setItems).catch(console.error)
  useEffect(load, [company.id])
  async function add(event: FormEvent) {
    event.preventDefault(); if (!name.trim()) return
    setBusy(true)
    try { const created = await createProject(company.id, { name: name.trim(), project_type: type }); setName(''); await load(); onSelect(created) } finally { setBusy(false) }
  }
  return <div className="two-column">
    <section className="page-card"><div className="section-heading"><div><span className="eyebrow">PROYECTOS</span><h2>{items.length} proyectos</h2></div></div><div className="list-grid">{items.map((project) => <button key={project.id} className={`list-card ${selected?.id === project.id ? 'selected' : ''}`} onClick={() => onSelect(project)}><strong>{project.name}</strong><span>{project.project_type || 'Proyecto'} · {project.status}</span><small>{project.code || 'Sin código'}</small></button>)}</div></section>
    <section className="page-card compact-card"><h3>Nuevo proyecto</h3><form className="stack-form" onSubmit={add}><label><span>Nombre</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cocina Gómez" /></label><label><span>Tipo</span><select value={type} onChange={(e) => setType(e.target.value)}>{['Cocina','Clóset','Centro de entretenimiento','Baño','Oficina','Puerta','Mueble especial'].map(v => <option key={v}>{v}</option>)}</select></label><button className="primary-button" disabled={busy}><Plus size={16}/> Crear proyecto</button></form></section>
  </div>
}

function CutsPage({ company, project }: { company: Company; project: Project | null }) {
  const [sheets, setSheets] = useState<CutSheet[]>([])
  const [sheet, setSheet] = useState<CutSheet | null>(null)
  const [pieces, setPieces] = useState<CutPiece[]>([])
  const [newSheet, setNewSheet] = useState('Blanco')
  const [form, setForm] = useState({ quantity: 1, name: '', length: 600, width: 300 })
  async function loadSheets() { if (!project) return; const data = await listCutSheets(project.id); setSheets(data); setSheet((current) => data.find(s => s.id === current?.id) || data[0] || null) }
  async function loadPieces() { if (!sheet) { setPieces([]); return }; setPieces(await listCutPieces(sheet.id)) }
  useEffect(() => { loadSheets().catch(console.error) }, [project?.id])
  useEffect(() => { loadPieces().catch(console.error) }, [sheet?.id])
  if (!project) return <EmptyProject />
  async function addSheet() { if (!newSheet.trim()) return; const created = await createCutSheet(company.id, project.id, newSheet.trim()); setNewSheet(''); await loadSheets(); setSheet(created) }
  async function addPiece(event: FormEvent) {
    event.preventDefault(); if (!sheet || !form.name.trim()) return
    const rigid = sheetUsesRigidCommands([...pieces.map(p => p.description || p.name), form.name])
    const parsed = parseCutDescription(form.name, Number(form.length), Number(form.width), Number(form.quantity), sheet.thickness_mm, rigid)
    await createCutPiece(company.id, sheet.id, { name: form.name, description: form.name, quantity: Number(form.quantity), length_mm: Number(form.length), width_mm: Number(form.width), thickness_mm: sheet.thickness_mm, ...parsed })
    setForm({ ...form, name: '' }); await loadPieces()
  }
  async function reparseAll() {
    if (!sheet) return
    const rigid = sheetUsesRigidCommands(pieces.map(p => p.description || p.name))
    await Promise.all(pieces.map((p) => updateCutPiece(p.id, parseCutDescription(p.description || p.name, p.length_mm, p.width_mm, p.quantity, p.thickness_mm, rigid))))
    await loadPieces()
  }
  const edgeMeters = pieces.reduce((sum, p) => sum + p.quantity * (((p.edge_left ? p.length_mm : 0) + (p.edge_right ? p.length_mm : 0) + (p.edge_top ? p.width_mm : 0) + (p.edge_bottom ? p.width_mm : 0)) / 1000), 0)
  return <div className="stack-xl">
    <section className="page-card toolbar-card"><div><span className="eyebrow">{project.name}</span><h2>Tabla de cortes</h2></div><div className="inline-form"><input value={newSheet} onChange={(e) => setNewSheet(e.target.value)} placeholder="Color/hoja"/><button className="secondary-button" onClick={addSheet}><Plus size={15}/> Hoja</button><button className="secondary-button" onClick={reparseAll}><RefreshCw size={15}/> Leer descripción</button></div></section>
    <div className="sheet-tabs">{sheets.map(s => <button key={s.id} className={sheet?.id === s.id ? 'active' : ''} onClick={() => setSheet(s)}>{s.name}</button>)}</div>
    {!sheet ? <section className="page-card empty-state"><h2>Crea la primera hoja</h2></section> : <>
      <section className="page-card cut-summary"><strong>{sheet.color || sheet.name}</strong><span>{pieces.reduce((n,p) => n + p.quantity,0)} piezas</span><span>{edgeMeters.toFixed(2)} m de canto</span><span>{pieces.reduce((n,p)=>n+p.hinge_count,0)} bisagras</span><span>{pieces.reduce((n,p)=>n+p.handle_count,0)} manijas</span><span>{pieces.reduce((n,p)=>n+p.gas_strut_count,0)} gatos</span></section>
      <section className="page-card table-card"><div className="table-scroll"><table className="data-table"><thead><tr><th>Cant.</th><th>Descripción</th><th>Largo</th><th>Ancho</th><th>Izq.</th><th>Der.</th><th>Sup.</th><th>Inf.</th><th>Bis.</th><th>Man.</th><th>Gatos</th><th></th></tr></thead><tbody>{pieces.map((p) => <tr key={p.id}><td>{p.quantity}</td><td><input defaultValue={p.description || p.name} onBlur={async e => { await updateCutPiece(p.id,{description:e.target.value,name:e.target.value}); await loadPieces() }}/></td><td>{p.length_mm}</td><td>{p.width_mm}</td><td>{p.edge_left || ''}</td><td>{p.edge_right || ''}</td><td>{p.edge_top || ''}</td><td>{p.edge_bottom || ''}</td><td>{p.hinge_count}</td><td>{p.handle_count}</td><td>{p.gas_strut_count}{p.gas_strut_newtons ? ` · ${p.gas_strut_newtons}N` : ''}</td><td><button className="mini-icon" onClick={async()=>{await deleteCutPiece(p.id);await loadPieces()}}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div></section>
      <section className="page-card"><form className="row-form" onSubmit={addPiece}><input type="number" min="1" value={form.quantity} onChange={e=>setForm({...form,quantity:Number(e.target.value)})}/><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ej: PUERTA 2L 1C PL"/><input type="number" value={form.length} onChange={e=>setForm({...form,length:Number(e.target.value)})} placeholder="Largo"/><input type="number" value={form.width} onChange={e=>setForm({...form,width:Number(e.target.value)})} placeholder="Ancho"/><button className="primary-button"><Plus size={15}/> Pieza</button></form></section>
    </>}
  </div>
}

function OptimizerPage({ company, project }: { company: Company; project: Project | null }) {
  const [sheets, setSheets] = useState<CutSheet[]>([])
  const [selected, setSelected] = useState<CutSheet | null>(null)
  const [pieces, setPieces] = useState<CutPiece[]>([])
  const [result, setResult] = useState<OptimizedSheet[]>([])
  const [message, setMessage] = useState('')
  useEffect(() => { if (!project) return; listCutSheets(project.id).then(data => { setSheets(data); setSelected(data[0] || null) }) }, [project?.id])
  useEffect(() => { if (selected) listCutPieces(selected.id).then(setPieces); else setPieces([]) }, [selected?.id])
  if (!project) return <EmptyProject />
  async function run() {
    if (!selected) return
    setMessage('')
    try {
      const expanded = pieces.flatMap(p => Array.from({ length: p.quantity }, (_, i) => ({ id: `${p.id}:${i+1}`, label: p.name, length: p.length_mm, width: p.width_mm, grain: selected.grain_enabled })))
      const optimized = optimizeSheets(expanded, { sheetLength: selected.sheet_length_mm, sheetWidth: selected.sheet_width_mm, kerf: selected.kerf_mm, margin: Math.max(selected.margin_top_mm, selected.margin_left_mm), allowHalf: selected.half_sheet_mode !== 'none' })
      setResult(optimized)
      const hash = JSON.stringify(expanded.map(p=>[p.id,p.length,p.width,p.grain]))
      await saveOptimizerRun({ companyId: company.id, projectId: project.id, cutSheetId: selected.id, inputHash: hash, config: { sheetLength:selected.sheet_length_mm,sheetWidth:selected.sheet_width_mm,kerf:selected.kerf_mm,margin:selected.margin_top_mm,half:selected.half_sheet_mode }, sheets: optimized })
      setMessage('Optimización guardada como resultado principal.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error al optimizar.') }
  }
  const equivalent = result.reduce((sum,s)=>sum+(s.kind==='full'?1:.5),0)
  return <div className="stack-xl"><section className="page-card toolbar-card"><div><span className="eyebrow">OPTIMIZADOR</span><h2>{project.name}</h2></div><div className="inline-form"><select value={selected?.id||''} onChange={e=>setSelected(sheets.find(s=>s.id===e.target.value)||null)}>{sheets.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select><button className="primary-button" onClick={run}><WandSparkles size={16}/> Optimizar</button></div></section>{selected && <section className="page-card cut-summary"><span>Lámina {selected.sheet_length_mm} × {selected.sheet_width_mm}</span><span>Disco {selected.kerf_mm} mm</span><span>Veta: {selected.grain_enabled?'Sí':'No'}</span><strong>{result.length ? `${selected.name}: ${equivalent} láminas` : 'Sin resultado'}</strong></section>}{message&&<div className="notice">{message}</div>}<div className="optimizer-grid">{result.map((sheet,index)=><article className="page-card optimizer-card" key={index}><div className="section-heading"><div><span className="eyebrow">LÁMINA {index+1}</span><h3>{sheet.kind==='full'?'Completa':'Media lámina'} · {sheet.utilization.toFixed(1)}%</h3></div></div><div className="sheet-canvas" style={{aspectRatio:`${sheet.length}/${sheet.width}`}}>{sheet.placements.map((p,i)=><div key={`${p.id}-${i}`} className="placed-piece" style={{left:`${p.x/sheet.length*100}%`,top:`${p.y/sheet.width*100}%`,width:`${(p.rotated?p.width:p.length)/sheet.length*100}%`,height:`${(p.rotated?p.length:p.width)/sheet.width*100}%`}}><span>{p.label}</span><small>{p.length}×{p.width}</small></div>)}</div></article>)}</div></div>
}

function BudgetPage({ company, project }: { company: Company; project: Project | null }) {
  const [budget,setBudget]=useState<Budget|null>(null); const [sheets,setSheets]=useState<BudgetSheet[]>([]); const [active,setActive]=useState<BudgetSheet|null>(null); const [lines,setLines]=useState<BudgetLine[]>([]); const [form,setForm]=useState({description:'',quantity:1,unit:'unit',price:0})
  async function init(){if(!project)return;const b=await ensureBudget(company.id,project.id,company.currency_code);setBudget(b);const ss=await listBudgetSheets(b.id);setSheets(ss);setActive(a=>ss.find(s=>s.id===a?.id)||ss[0]||null)}
  useEffect(()=>{init().catch(console.error)},[project?.id]); useEffect(()=>{if(active)listBudgetLines(active.id).then(setLines);else setLines([])},[active?.id])
  if(!project)return <EmptyProject/>; if(!budget)return <Loading label="Preparando presupuesto…"/>
  async function add(e:FormEvent){e.preventDefault();if(!active||!form.description.trim())return;await createBudgetLine(company.id,active.id,{internal_description:form.description,quantity:Number(form.quantity),unit:form.unit,unit_cost:Number(form.price)});setForm({...form,description:'',price:0});setLines(await listBudgetLines(active.id))}
  const sheetSubtotal=lines.reduce((s,l)=>s+Number(l.subtotal||l.quantity*l.unit_cost),0)
  const base=sheetSubtotal*(1+budget.contingency_percent/100); const sale=budget.pricing_mode==='margin'&&budget.profit_percent<100?base/(1-budget.profit_percent/100):base*(1+budget.profit_percent/100); const discounted=sale*(1-budget.discount_percent/100); const total=discounted*(1+budget.tax_percent/100)
  async function saveSettings(patch:Partial<Budget>){setBudget(await updateBudget(budget.id,patch))}
  return <div className="stack-xl"><section className="page-card toolbar-card"><div><span className="eyebrow">PRESUPUESTO</span><h2>{project.name}</h2></div><strong>{money(budget.manual_total??total,budget.currency_code)}</strong></section><div className="sheet-tabs">{sheets.map(s=><button key={s.id} className={active?.id===s.id?'active':''} onClick={()=>setActive(s)}>{s.name}</button>)}</div><div className="budget-layout"><section className="page-card table-card"><div className="table-scroll"><table className="data-table"><thead><tr><th>Descripción</th><th>Cant.</th><th>Unidad</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>{lines.map(l=><tr key={l.id}><td>{l.internal_description}</td><td>{l.quantity}</td><td>{l.unit}</td><td>{money(l.unit_cost,budget.currency_code)}</td><td>{money(Number(l.subtotal||0),budget.currency_code)}</td></tr>)}</tbody></table></div><form className="row-form" onSubmit={add}><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Descripción"/><input type="number" value={form.quantity} onChange={e=>setForm({...form,quantity:Number(e.target.value)})}/><input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/><input type="number" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})}/><button className="primary-button"><Plus size={15}/> Agregar</button></form></section><aside className="page-card budget-summary"><h3>Resumen comercial</h3><label><span>Método</span><select value={budget.pricing_mode} onChange={e=>saveSettings({pricing_mode:e.target.value})}><option value="markup">Utilidad sobre costo</option><option value="margin">Margen sobre venta</option></select></label><label><span>Utilidad / margen %</span><input type="number" value={budget.profit_percent} onChange={e=>saveSettings({profit_percent:Number(e.target.value)})}/></label><label><span>Imprevistos %</span><input type="number" value={budget.contingency_percent} onChange={e=>saveSettings({contingency_percent:Number(e.target.value)})}/></label><label><span>Descuento %</span><input type="number" value={budget.discount_percent} onChange={e=>saveSettings({discount_percent:Number(e.target.value)})}/></label><label><span>Impuesto %</span><input type="number" value={budget.tax_percent} onChange={e=>saveSettings({tax_percent:Number(e.target.value)})}/></label><div className="total-box"><span>Total estimado</span><strong>{money(total,budget.currency_code)}</strong></div></aside></div></div>
}

function QuotationPage({ company, project }: { company: Company; project: Project | null }) {
  const [items,setItems]=useState<Quotation[]>([]); const [budget,setBudget]=useState<Budget|null>(null)
  async function load(){if(!project)return;setItems(await listQuotations(project.id));setBudget(await ensureBudget(company.id,project.id,company.currency_code))}
  useEffect(()=>{load().catch(console.error)},[project?.id]); if(!project)return <EmptyProject/>
  async function add(){if(!budget)return;await createQuotation(company.id,project.id,budget.id,company.currency_code);await load()}
  return <div className="stack-xl"><section className="page-card toolbar-card"><div><span className="eyebrow">COTIZACIÓN</span><h2>{project.name}</h2></div><button className="primary-button" onClick={add}><Plus size={15}/> Nueva cotización</button></section><div className="list-grid quote-grid">{items.map(q=><article className="page-card quote-card" key={q.id}><span className="eyebrow">{q.number}</span><h3>{q.title}</h3><p>Estado: {q.status}</p><p>Válida hasta: {q.valid_until||'Sin fecha'}</p><div className="info-strip"><span>Plantilla: {q.template}</span><span>{q.currency_code}</span></div></article>)}</div>{!items.length&&<section className="page-card empty-state"><FileText size={30}/><h2>Aún no hay cotizaciones</h2><p>Crea la primera propuesta comercial vinculada al presupuesto.</p></section>}</div>
}

function ClientsPage({ company }: { company: Company }) {
  const [items,setItems]=useState<Client[]>([]); const [name,setName]=useState(''); const [email,setEmail]=useState('')
  const load=()=>listClients(company.id).then(setItems); useEffect(()=>{load().catch(console.error)},[company.id])
  async function add(e:FormEvent){e.preventDefault();if(!name.trim())return;await createClient(company.id,{name:name.trim(),email:email||null});setName('');setEmail('');await load()}
  return <div className="two-column"><section className="page-card"><div className="section-heading"><div><span className="eyebrow">CLIENTES</span><h2>{items.length} registrados</h2></div></div><div className="list-grid">{items.map(c=><article className="list-card static" key={c.id}><strong>{c.name}</strong><span>{c.email||'Sin correo'}</span><small>{c.phone||c.city||'Sin contacto adicional'}</small></article>)}</div></section><section className="page-card compact-card"><h3>Nuevo cliente</h3><form className="stack-form" onSubmit={add}><label><span>Nombre</span><input value={name} onChange={e=>setName(e.target.value)}/></label><label><span>Correo</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="primary-button"><Plus size={15}/> Guardar</button></form></section></div>
}

function CatalogPage({ company }: { company: Company }) {
  const [items,setItems]=useState<CatalogItem[]>([]); const [form,setForm]=useState({code:'',name:'',category:'material',unit:'unit',price:0})
  const load=()=>listCatalog(company.id).then(setItems); useEffect(()=>{load().catch(console.error)},[company.id])
  async function add(e:FormEvent){e.preventDefault();if(!form.name.trim())return;await createCatalogItem(company.id,{...form,price:Number(form.price)});setForm({...form,code:'',name:'',price:0});await load()}
  return <div className="stack-xl"><section className="page-card"><div className="section-heading"><div><span className="eyebrow">CATÁLOGO MAESTRO</span><h2>Precios y recomendaciones</h2></div></div><form className="row-form" onSubmit={add}><input value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="Código"/><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Artículo"/><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>material</option><option>herraje</option><option>servicio</option><option>mano_obra</option><option>transporte</option><option>other</option></select><input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/><input type="number" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})}/><button className="primary-button"><Plus size={15}/> Agregar</button></form></section><section className="page-card table-card"><div className="table-scroll"><table className="data-table"><thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Unidad</th><th>Precio</th></tr></thead><tbody>{items.map(i=><tr key={i.id}><td>{i.code||'—'}</td><td>{i.name}</td><td>{i.category}</td><td>{i.unit}</td><td>{money(i.price,company.currency_code)}</td></tr>)}</tbody></table></div></section></div>
}

function SettingsPage({ company, onUpdated }: { company: Company; onUpdated: (company: Company) => void }) {
  const [draft,setDraft]=useState(company); const [license,setLicense]=useState<any>(null); const [saving,setSaving]=useState(false)
  useEffect(()=>{setDraft(company);getCompanyLicense(company.id).then(setLicense).catch(console.error)},[company.id])
  const currencyOptions=[...new Set(CURRENCIES.map(i=>i[2]))]
  async function save(){setSaving(true);try{const updated=await updateCompany(company.id,{name:draft.name,country_code:draft.country_code,currency_code:draft.currency_code,measurement_unit:draft.measurement_unit,decimal_places:draft.decimal_places,phone:draft.phone,email:draft.email,city:draft.city,primary_color:draft.primary_color,secondary_color:draft.secondary_color});onUpdated(updated)}finally{setSaving(false)}}
  return <div className="settings-layout"><aside className="settings-menu page-card">{['General','Empresa','Moneda y medidas','Cotización','Optimizador','Materiales','Correo','Respaldos','Personalización','Licencia'].map((item,index)=><button className={index===0?'active':''} key={item}>{item}</button>)}</aside><section className="page-card settings-content"><div className="section-heading"><div><span className="eyebrow">CONFIGURACIÓN GLOBAL</span><h2>Empresa y preferencias</h2><p>Estas preferencias se comparten en todos los módulos.</p></div><button className="primary-button" onClick={save}>{saving?'Guardando…':'Guardar cambios'}</button></div><div className="form-grid"><label><span>Empresa</span><input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label><span>País</span><input value={draft.country_code||''} onChange={e=>setDraft({...draft,country_code:e.target.value.toUpperCase()})}/></label><label><span>Moneda</span><select value={draft.currency_code} onChange={e=>setDraft({...draft,currency_code:e.target.value})}>{currencyOptions.map(c=><option key={c}>{c}</option>)}</select></label><label><span>Unidad general</span><select value={draft.measurement_unit} onChange={e=>setDraft({...draft,measurement_unit:e.target.value})}>{MEASUREMENT_UNITS.map(u=><option value={u} key={u}>{u.toUpperCase()}</option>)}</select></label><label><span>Decimales</span><input type="number" min="0" max="4" value={draft.decimal_places} onChange={e=>setDraft({...draft,decimal_places:Number(e.target.value)})}/></label><label><span>Ciudad</span><input value={draft.city||''} onChange={e=>setDraft({...draft,city:e.target.value})}/></label><label><span>Correo</span><input value={draft.email||''} onChange={e=>setDraft({...draft,email:e.target.value})}/></label><label><span>Teléfono</span><input value={draft.phone||''} onChange={e=>setDraft({...draft,phone:e.target.value})}/></label></div>{license&&<div className="license-card"><div><span className="eyebrow">LICENCIA</span><h3>{license.license_type} · {license.status}</h3></div><div><strong>{license.max_devices}</strong><span>equipos permitidos</span></div><div><strong>{new Date(license.expires_at).toLocaleDateString()}</strong><span>vencimiento</span></div></div>}</section></div>
}

export default function App() {
  const [ready,setReady]=useState(false); const [session,setSession]=useState<any>(null); const [company,setCompany]=useState<Company|null>(null); const [activeModule,setActiveModule]=useState<ModuleId>('dashboard'); const [selectedProject,setSelectedProject]=useState<Project|null>(null); const [dark,setDark]=useState(false); const [error,setError]=useState('')

  async function refreshAuth(){
    if(!isSupabaseConfigured){setReady(true);return}
    const {data}=await getSession(); setSession(data.session)
    if(data.session){try{let current=await getCurrentCompany();if(!current){await bootstrapCompany('Maderoom');current=await getCurrentCompany()}setCompany(current);const projects=current?await listProjects(current.id):[];setSelectedProject(p=>projects.find(item=>item.id===p?.id)||projects[0]||null)}catch(e){setError(e instanceof Error?e.message:'Error al cargar la empresa')}} else setCompany(null)
    setReady(true)
  }
  useEffect(()=>{refreshAuth();if(!isSupabaseConfigured)return;const {data}=onAuthChange(()=>refreshAuth());return()=>data.subscription.unsubscribe()},[])

  if(!ready)return <div className="auth-shell"><Loading/></div>
  if(!isSupabaseConfigured)return <div className="auth-shell"><section className="auth-card"><h1>Falta conectar Supabase</h1><p>La aplicación necesita VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.</p></section></div>
  if(!session)return <AuthScreen onReady={refreshAuth}/>
  if(!company)return <div className="auth-shell"><section className="auth-card"><h2>No se pudo cargar la empresa</h2><p>{error}</p><button className="primary-button" onClick={refreshAuth}>Reintentar</button></section></div>

  const current=modules.find(m=>m.id===activeModule)!
  const content = activeModule==='dashboard'?<Dashboard company={company}/>:activeModule==='projects'?<ProjectsPage company={company} selected={selectedProject} onSelect={(p)=>{setSelectedProject(p);setActiveModule('cuts')}}/>:activeModule==='cuts'?<CutsPage company={company} project={selectedProject}/>:activeModule==='optimizer'?<OptimizerPage company={company} project={selectedProject}/>:activeModule==='budget'?<BudgetPage company={company} project={selectedProject}/>:activeModule==='quotation'?<QuotationPage company={company} project={selectedProject}/>:activeModule==='clients'?<ClientsPage company={company}/>:activeModule==='catalog'?<CatalogPage company={company}/>:<SettingsPage company={company} onUpdated={setCompany}/>

  return <div className={dark?'app dark':'app'}><aside className="sidebar"><div className="brand"><div className="brand-mark">M</div><div><strong>{company.name}</strong><span>Studio Online</span></div></div><nav>{modules.map(module=>{const Icon=module.icon;return <button key={module.id} className={activeModule===module.id?'active':''} onClick={()=>setActiveModule(module.id)}><Icon size={18}/><span>{module.label}</span></button>})}</nav><div className="sidebar-footer"><span>Online · Supabase</span><small>{selectedProject?`Proyecto: ${selectedProject.name}`:'Sin proyecto seleccionado'}</small></div></aside><main className="main-shell"><header className="topbar"><div><span className="eyebrow">{selectedProject?selectedProject.name:'MÓDULO'}</span><h2>{current.label}</h2></div><div className="top-actions"><div className="sync-pill"><span/> Sincronizado</div><button className="icon-button" onClick={()=>setDark(v=>!v)}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button><button className="icon-button" title="Cerrar sesión" onClick={()=>signOut()}><LogOut size={18}/></button><div className="avatar">{company.name.slice(0,2).toUpperCase()}</div></div></header><div className="page-content">{content}</div></main></div>
}

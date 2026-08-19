import { useMemo, useState } from 'react'
import {
  Boxes,
  Calculator,
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Moon,
  PackageSearch,
  Settings,
  Sun,
  Users,
  WandSparkles,
} from 'lucide-react'
import { CURRENCIES, MEASUREMENT_UNITS } from './domain/rules'

type ModuleId =
  | 'dashboard'
  | 'projects'
  | 'cuts'
  | 'optimizer'
  | 'budget'
  | 'quotation'
  | 'clients'
  | 'catalog'
  | 'settings'

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

const statusCards = [
  ['Proyectos activos', '12', '4 en cotización'],
  ['Cotizaciones', '7', '2 por vencer'],
  ['Optimizaciones', '18', '3 pendientes'],
  ['Clientes', '31', '6 este mes'],
]

function Placeholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="page-card empty-state">
      <div className="empty-icon"><Boxes size={28} /></div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <span className="phase-badge">Módulo preparado para desarrollo</span>
    </section>
  )
}

function Dashboard() {
  return (
    <div className="stack-xl">
      <div className="hero">
        <div>
          <span className="eyebrow">MADEROOM STUDIO ONLINE</span>
          <h1>Controla diseño, cortes, costos y cotizaciones desde un solo lugar.</h1>
          <p>La nueva plataforma web mantiene las reglas del sistema original, ahora organizada para múltiples empresas, usuarios y licencias.</p>
        </div>
        <button className="primary-button">Nuevo proyecto</button>
      </div>

      <div className="metrics-grid">
        {statusCards.map(([label, value, detail]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </div>

      <section className="page-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FLUJO DE TRABAJO</span>
            <h2>Del proyecto a la propuesta final</h2>
          </div>
        </div>
        <div className="workflow-grid">
          {[
            ['01', 'Cortes', 'Importa Excel, administra hojas por material y reconoce 1L, LR, LRG, PL, PC y PLG.'],
            ['02', 'Optimización', 'Respeta veta por Largo, disco, márgenes, cortes guillotina, media lámina y retazos.'],
            ['03', 'Presupuesto', 'Recibe láminas optimizadas, cantos, herrajes, servicios y precios del catálogo.'],
            ['04', 'Cotización', 'Transforma el presupuesto interno en una propuesta comercial configurable y PDF.'],
          ].map(([number, title, copy]) => (
            <article className="workflow-card" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function SettingsPage() {
  const [currency, setCurrency] = useState('COP')
  const [unit, setUnit] = useState('mm')
  const countries = useMemo(() => CURRENCIES.filter((item) => item[2] === currency), [currency])

  return (
    <div className="settings-layout">
      <aside className="settings-menu page-card">
        {['General', 'Empresa', 'Moneda y medidas', 'Cotización', 'Optimizador', 'Materiales', 'Correo', 'Respaldos', 'Personalización', 'Licencia'].map((item, index) => (
          <button className={index === 2 ? 'active' : ''} key={item}>{item}</button>
        ))}
      </aside>
      <section className="page-card settings-content">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CONFIGURACIÓN GLOBAL</span>
            <h2>Moneda y unidades</h2>
            <p>La interfaz cambia; internamente las medidas se conservarán en milímetros.</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            <span>Moneda</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              {[...new Set(CURRENCIES.map((item) => item[2]))].map((code) => <option key={code}>{code}</option>)}
            </select>
          </label>
          <label>
            <span>Unidad de medida</span>
            <select value={unit} onChange={(event) => setUnit(event.target.value)}>
              {MEASUREMENT_UNITS.map((value) => <option value={value} key={value}>{value.toUpperCase()}</option>)}
            </select>
          </label>
        </div>
        <div className="info-strip">
          <strong>{currency}</strong>
          <span>{countries.map((item) => item[0]).join(' · ') || 'Moneda configurada'}</span>
          <span>Unidad actual: {unit.toUpperCase()}</span>
        </div>
      </section>
    </div>
  )
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard')
  const [dark, setDark] = useState(false)
  const current = modules.find((module) => module.id === activeModule)!

  const content = activeModule === 'dashboard'
    ? <Dashboard />
    : activeModule === 'settings'
      ? <SettingsPage />
      : <Placeholder title={current.label} subtitle={`La estructura de ${current.label} ya forma parte de la arquitectura online y se desarrollará sobre Supabase sin mezclarla con la app anterior.`} />

  return (
    <div className={dark ? 'app dark' : 'app'}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div><strong>Maderoom</strong><span>Studio Online</span></div>
        </div>
        <nav>
          {modules.map((module) => {
            const Icon = module.icon
            return (
              <button key={module.id} className={activeModule === module.id ? 'active' : ''} onClick={() => setActiveModule(module.id)}>
                <Icon size={18} />
                <span>{module.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <span>Versión web · 0.1</span>
          <small>Base comercial multiempresa</small>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div>
            <span className="eyebrow">MÓDULO</span>
            <h2>{current.label}</h2>
          </div>
          <div className="top-actions">
            <div className="sync-pill"><span /> Preparado para Supabase</div>
            <button className="icon-button" aria-label="Cambiar tema" onClick={() => setDark((value) => !value)}>
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <div className="avatar">JR</div>
          </div>
        </header>
        <div className="page-content">{content}</div>
      </main>
    </div>
  )
}

import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function maderoomSourcePatches(): Plugin {
  return {
    name: 'maderoom-source-patches',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/App.tsx')) return null

      let next = code

      // Never return a Promise from a React effect cleanup.
      next = next.replaceAll(
        'useEffect(load, [company.id])',
        'useEffect(() => { void load() }, [company.id])',
      )

      // Configurable Excel import/export helpers.
      if (!next.includes("from './lib/cutTransfer'")) {
        next = next.replace(
          "import { isSupabaseConfigured } from './lib/supabase'",
          "import { isSupabaseConfigured } from './lib/supabase'\nimport { createConfiguredBaseWorkbook, exportConfiguredCutWorkbook, readConfiguredCutWorkbook, loadCutTransferConfig, saveCutTransferConfig, EXPORT_FIELD_OPTIONS, type CutTransferConfig } from './lib/cutTransfer'",
        )
      }

      // updateCutSheet already exists in the data layer; expose it to App.tsx.
      if (!next.includes('  updateCutSheet,')) {
        next = next.replace('  updateCutPiece,', '  updateCutPiece,\n  updateCutSheet,')
      }

      // Transfer configuration state in CutsPage.
      const formLine = "  const [form, setForm] = useState({ quantity: 1, name: '', length: 600, width: 300 })"
      if (next.includes(formLine) && !next.includes('showTransferSettings')) {
        next = next.replace(formLine, `${formLine}\n  const [showTransferSettings, setShowTransferSettings] = useState(false)\n  const [transferConfig, setTransferConfig] = useState<CutTransferConfig>(() => loadCutTransferConfig())\n  function saveTransferConfig(patch: Partial<CutTransferConfig>) {\n    const updated = { ...transferConfig, ...patch }\n    setTransferConfig(updated)\n    saveCutTransferConfig(updated)\n  }\n  function toggleExportField(field: any) {\n    const exists = transferConfig.exportFields.includes(field)\n    saveTransferConfig({ exportFields: exists ? transferConfig.exportFields.filter(f => f !== field) : [...transferConfig.exportFields, field] })\n  }`)
      }

      const addSheetLine = "  async function addSheet() { if (!newSheet.trim()) return; const created = await createCutSheet(company.id, project.id, newSheet.trim()); setNewSheet(''); await loadSheets(); setSheet(created) }"
      if (next.includes(addSheetLine) && !next.includes('async function renameCurrentSheet()')) {
        next = next.replace(addSheetLine, `${addSheetLine}\n  async function renameCurrentSheet() {\n    if (!sheet) return\n    const value = window.prompt('Nuevo nombre de la hoja', sheet.name)\n    const name = value?.trim()\n    if (!name || name === sheet.name) return\n    const updated = await updateCutSheet(sheet.id, { name, color: name })\n    setSheet(updated)\n    await loadSheets()\n    setSheet(updated)\n  }\n  async function importExcelFile(file: File) {\n    const imported = await readConfiguredCutWorkbook(file, transferConfig)\n    if (!imported.length) { window.alert('No se encontraron filas válidas con la configuración actual de importación.'); return }\n    const latestSheets = await listCutSheets(project.id)\n    for (const excelSheet of imported) {\n      let target = latestSheets.find(s => s.name.trim().toLowerCase() === excelSheet.name.trim().toLowerCase())\n      if (!target) { target = await createCutSheet(company.id, project.id, excelSheet.name); latestSheets.push(target) }\n      const existing = await listCutPieces(target.id)\n      const rigid = sheetUsesRigidCommands([...existing.map(p => p.description || p.name), ...excelSheet.rows.map(r => r.name)])\n      for (const row of excelSheet.rows) {\n        const parsed = parseCutDescription(row.name, row.length, row.width, row.quantity, target.thickness_mm, rigid)\n        await createCutPiece(company.id, target.id, { name: row.name, description: row.name, quantity: row.quantity, length_mm: row.length, width_mm: row.width, thickness_mm: target.thickness_mm, ...parsed })\n      }\n    }\n    await loadSheets()\n    window.alert('Archivo importado correctamente con el perfil configurado.')\n  }\n  async function exportExcelFile() {\n    const sourceSheets = transferConfig.exportScope === 'current' && sheet ? [sheet] : sheets\n    if (!sourceSheets.length) { window.alert('No hay hojas para exportar.'); return }\n    const payload = await Promise.all(sourceSheets.map(async s => {\n      const rows = await listCutPieces(s.id)\n      return { name: s.name, color: s.color, pieces: rows.map(p => ({ quantity: p.quantity, description: p.description || p.name, length: p.length_mm, width: p.width_mm, edge_left: p.edge_left, edge_right: p.edge_right, edge_top: p.edge_top, edge_bottom: p.edge_bottom, hinges: p.hinge_count, handles: p.handle_count, gas_struts: p.gas_strut_count, gas_newtons: p.gas_strut_newtons })) }\n    }))\n    exportConfiguredCutWorkbook(payload, transferConfig, \`Maderoom_Cortes_\${project.name.replace(/[^a-z0-9_-]+/gi, '_')}.xlsx\`)\n  }`)
      }

      // Replace earlier fixed Excel functions if they are already present from a previous build source patch.
      next = next.replace('const imported = await readCutWorkbook(file)', 'const imported = await readConfiguredCutWorkbook(file, transferConfig)')
      next = next.replace('createBaseCutWorkbook', 'createConfiguredBaseWorkbook')

      const oldToolbar = `<section className="page-card toolbar-card"><div><span className="eyebrow">{project.name}</span><h2>Tabla de cortes</h2></div><div className="inline-form"><input value={newSheet} onChange={(e) => setNewSheet(e.target.value)} placeholder="Color/hoja"/><button className="secondary-button" onClick={addSheet}><Plus size={15}/> Hoja</button><button className="secondary-button" onClick={reparseAll}><RefreshCw size={15}/> Leer descripción</button></div></section>`
      const newToolbar = `<section className="page-card toolbar-card"><div><span className="eyebrow">{project.name}</span><h2>Tabla de cortes</h2></div><div className="inline-form"><input value={newSheet} onChange={(e) => setNewSheet(e.target.value)} placeholder="Color/hoja"/><button className="secondary-button" onClick={addSheet}><Plus size={15}/> Nueva hoja</button><button className="secondary-button" onClick={renameCurrentSheet} disabled={!sheet}>Renombrar hoja</button><button className="secondary-button" onClick={reparseAll}><RefreshCw size={15}/> Leer descripción</button><button className="secondary-button" onClick={() => setShowTransferSettings(v => !v)}>Config. importar/exportar</button><button className="secondary-button" onClick={() => createConfiguredBaseWorkbook(transferConfig)}>Crear archivo base</button><button className="secondary-button" onClick={() => document.getElementById('cut-excel-import')?.click()}>Importar Excel</button><button className="secondary-button" onClick={exportExcelFile}>Exportar Excel</button><input id="cut-excel-import" type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={async e => { const file=e.target.files?.[0]; if(file) await importExcelFile(file); e.currentTarget.value='' }}/></div></section>`
      if (next.includes(oldToolbar)) next = next.replace(oldToolbar, newToolbar)

      // If the richer toolbar from the previous patch already exists, add the configuration button and configured template call.
      next = next.replace(
        `<button className="secondary-button" onClick={reparseAll}><RefreshCw size={15}/> Leer descripción</button><button className="secondary-button" onClick={createConfiguredBaseWorkbook}>Crear archivo base</button>`,
        `<button className="secondary-button" onClick={reparseAll}><RefreshCw size={15}/> Leer descripción</button><button className="secondary-button" onClick={() => setShowTransferSettings(v => !v)}>Config. importar/exportar</button><button className="secondary-button" onClick={() => createConfiguredBaseWorkbook(transferConfig)}>Crear archivo base</button>`,
      )

      // Transfer settings panel. Import can map by header names or by physical column positions.
      const tabsMarker = `    <div className="sheet-tabs">{sheets.map(s => <button key={s.id} className={sheet?.id === s.id ? 'active' : ''} onClick={() => setSheet(s)}>{s.name}</button>)}</div>`
      if (next.includes(tabsMarker) && !next.includes('CONFIGURACIÓN DE IMPORTACIÓN Y EXPORTACIÓN')) {
        const panel = `    {showTransferSettings && <section className="page-card stack-xl"><div className="section-heading"><div><span className="eyebrow">CONFIGURACIÓN DE IMPORTACIÓN Y EXPORTACIÓN</span><h3>Perfil de Excel</h3><p>Define cómo leer cualquier archivo y exactamente qué información quieres sacar.</p></div><button className="secondary-button" onClick={() => setShowTransferSettings(false)}>Cerrar</button></div><div className="form-grid"><label><span>Importar por</span><select value={transferConfig.importMode} onChange={e => saveTransferConfig({importMode:e.target.value as any})}><option value="headers">Nombre de encabezados</option><option value="positions">Posición de columnas</option></select></label><label><span>Fila de encabezados</span><input type="number" min="1" value={transferConfig.importHeaderRow} onChange={e => saveTransferConfig({importHeaderRow:Math.max(1,Number(e.target.value)||1)})}/></label></div>{transferConfig.importMode==='headers'?<div className="form-grid"><label><span>Columna Cantidad</span><input value={transferConfig.importColumns.quantity} onChange={e=>saveTransferConfig({importColumns:{...transferConfig.importColumns,quantity:e.target.value}} as any)}/></label><label><span>Columna Descripción</span><input value={transferConfig.importColumns.description} onChange={e=>saveTransferConfig({importColumns:{...transferConfig.importColumns,description:e.target.value}} as any)}/></label><label><span>Columna Largo</span><input value={transferConfig.importColumns.length} onChange={e=>saveTransferConfig({importColumns:{...transferConfig.importColumns,length:e.target.value}} as any)}/></label><label><span>Columna Ancho</span><input value={transferConfig.importColumns.width} onChange={e=>saveTransferConfig({importColumns:{...transferConfig.importColumns,width:e.target.value}} as any)}/></label></div>:<div className="form-grid"><label><span>Posición Cantidad</span><input type="number" min="1" value={transferConfig.importPositions.quantity} onChange={e=>saveTransferConfig({importPositions:{...transferConfig.importPositions,quantity:Number(e.target.value)}} as any)}/></label><label><span>Posición Descripción</span><input type="number" min="1" value={transferConfig.importPositions.description} onChange={e=>saveTransferConfig({importPositions:{...transferConfig.importPositions,description:Number(e.target.value)}} as any)}/></label><label><span>Posición Largo</span><input type="number" min="1" value={transferConfig.importPositions.length} onChange={e=>saveTransferConfig({importPositions:{...transferConfig.importPositions,length:Number(e.target.value)}} as any)}/></label><label><span>Posición Ancho</span><input type="number" min="1" value={transferConfig.importPositions.width} onChange={e=>saveTransferConfig({importPositions:{...transferConfig.importPositions,width:Number(e.target.value)}} as any)}/></label></div>}<div className="section-heading"><div><span className="eyebrow">EXPORTACIÓN</span><h3>Qué quieres incluir</h3></div></div><div className="form-grid"><label><span>Hojas a exportar</span><select value={transferConfig.exportScope} onChange={e=>saveTransferConfig({exportScope:e.target.value as any})}><option value="all">Todas las hojas</option><option value="current">Solo hoja actual</option></select></label><label><span><input type="checkbox" checked={transferConfig.exportIncludePieces} onChange={e=>saveTransferConfig({exportIncludePieces:e.target.checked})}/> Tabla de piezas</span></label><label><span><input type="checkbox" checked={transferConfig.exportIncludeEdgeSummary} onChange={e=>saveTransferConfig({exportIncludeEdgeSummary:e.target.checked})}/> Resumen completo de cantos</span></label></div><div className="page-card"><strong>Columnas de la tabla de piezas</strong><div className="form-grid">{EXPORT_FIELD_OPTIONS.map(item=><label key={item.key}><span><input type="checkbox" checked={transferConfig.exportFields.includes(item.key)} onChange={()=>toggleExportField(item.key)}/> {item.label}</span></label>)}</div></div><div className="notice">El resumen de cantos genera una hoja independiente con: Canto, Tipo, Color y Metros. Canto 1 = Flexible · Canto 2 = Rígido · Canto 3 = Rígido engrosado.</div></section>}`
        next = next.replace(tabsMarker, `${panel}\n${tabsMarker}`)
      }

      // Make quantity editable and recalculate all automatic commands for the row.
      const oldCutRowStart = `pieces.map((p) => <tr key={p.id}><td>{p.quantity}</td><td><input defaultValue={p.description || p.name}`
      const newCutRowStart = `pieces.map((p) => <tr key={p.id}><td><input type="number" min="1" defaultValue={p.quantity} style={{width:'70px'}} onBlur={async e => { const quantity=Math.max(1,Number(e.target.value)||1); const rigid=sheetUsesRigidCommands(pieces.map(item=>item.description||item.name)); const parsed=parseCutDescription(p.description||p.name,p.length_mm,p.width_mm,quantity,p.thickness_mm,rigid); await updateCutPiece(p.id,{quantity,...parsed}); await loadPieces() }}/></td><td><input defaultValue={p.description || p.name}`
      if (next.includes(oldCutRowStart)) next = next.replace(oldCutRowStart, newCutRowStart)

      // Separate edge totals by edge type. 1 = flexible, 2 = rigid, 3 = rigid/engrosado.
      const oldEdgeMeters = `  const edgeMeters = pieces.reduce((sum, p) => sum + p.quantity * (((p.edge_left ? p.length_mm : 0) + (p.edge_right ? p.length_mm : 0) + (p.edge_top ? p.width_mm : 0) + (p.edge_bottom ? p.width_mm : 0)) / 1000), 0)`
      const newEdgeMeters = `  const edgeMetersByType = pieces.reduce((totals, p) => {\n    const add = (type: number | null | undefined, mm: number) => { if (type === 1 || type === 2 || type === 3) totals[type] += (mm * p.quantity) / 1000 }\n    add(p.edge_left, p.length_mm); add(p.edge_right, p.length_mm); add(p.edge_top, p.width_mm); add(p.edge_bottom, p.width_mm)\n    return totals\n  }, { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>)\n  const edgeMeters = edgeMetersByType[1] + edgeMetersByType[2] + edgeMetersByType[3]`
      if (next.includes(oldEdgeMeters)) next = next.replace(oldEdgeMeters, newEdgeMeters)

      const oldSummary = `<section className="page-card cut-summary"><strong>{sheet.color || sheet.name}</strong><span>{pieces.reduce((n,p) => n + p.quantity,0)} piezas</span><span>{edgeMeters.toFixed(2)} m de canto</span><span>{pieces.reduce((n,p)=>n+p.hinge_count,0)} bisagras</span><span>{pieces.reduce((n,p)=>n+p.handle_count,0)} manijas</span><span>{pieces.reduce((n,p)=>n+p.gas_strut_count,0)} gatos</span></section>`
      const newSummary = `<section className="page-card cut-summary"><strong>{sheet.color || sheet.name}</strong><span>{pieces.reduce((n,p) => n + p.quantity,0)} piezas</span><span title="Canto flexible">1 · Flexible: {edgeMetersByType[1].toFixed(2)} m</span><span title="Canto rígido">2 · Rígido: {edgeMetersByType[2].toFixed(2)} m</span><span title="Canto rígido engrosado">3 · Rígido engrosado: {edgeMetersByType[3].toFixed(2)} m</span><span>Total canto: {edgeMeters.toFixed(2)} m</span><span>{pieces.reduce((n,p)=>n+p.hinge_count,0)} bisagras</span><span>{pieces.reduce((n,p)=>n+p.handle_count,0)} manijas</span><span>{pieces.reduce((n,p)=>n+p.gas_strut_count,0)} gatos</span></section>`
      if (next.includes(oldSummary)) next = next.replace(oldSummary, newSummary)

      return next === code ? null : { code: next, map: null }
    },
  }
}

export default defineConfig({
  plugins: [maderoomSourcePatches(), react()],
  base: '/maderoom-studio-online/',
  build: { sourcemap: true },
})

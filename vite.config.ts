import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Source compatibility transforms while the first online version is being stabilized.
 * They are intentionally small and target exact source fragments.
 */
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

      // Excel helpers.
      if (!next.includes("from './lib/cutExcel'")) {
        next = next.replace(
          "import { isSupabaseConfigured } from './lib/supabase'",
          "import { isSupabaseConfigured } from './lib/supabase'\nimport { createBaseCutWorkbook, exportCutWorkbook, readCutWorkbook } from './lib/cutExcel'",
        )
      }

      // updateCutSheet already exists in the data layer; expose it to App.tsx.
      if (!next.includes('  updateCutSheet,')) {
        next = next.replace('  updateCutPiece,', '  updateCutPiece,\n  updateCutSheet,')
      }

      const addSheetLine = "  async function addSheet() { if (!newSheet.trim()) return; const created = await createCutSheet(company.id, project.id, newSheet.trim()); setNewSheet(''); await loadSheets(); setSheet(created) }"
      if (next.includes(addSheetLine) && !next.includes('async function renameCurrentSheet()')) {
        next = next.replace(addSheetLine, `${addSheetLine}\n  async function renameCurrentSheet() {\n    if (!sheet) return\n    const value = window.prompt('Nuevo nombre de la hoja', sheet.name)\n    const name = value?.trim()\n    if (!name || name === sheet.name) return\n    const updated = await updateCutSheet(sheet.id, { name, color: name })\n    setSheet(updated)\n    await loadSheets()\n    setSheet(updated)\n  }\n  async function importExcelFile(file: File) {\n    const imported = await readCutWorkbook(file)\n    if (!imported.length) { window.alert('El archivo no contiene filas válidas. Usa las columnas Cantidad, Pieza, Largo y Ancho.'); return }\n    const latestSheets = await listCutSheets(project.id)\n    for (const excelSheet of imported) {\n      let target = latestSheets.find(s => s.name.trim().toLowerCase() === excelSheet.name.trim().toLowerCase())\n      if (!target) {\n        target = await createCutSheet(company.id, project.id, excelSheet.name)\n        latestSheets.push(target)\n      }\n      const existing = await listCutPieces(target.id)\n      const rigid = sheetUsesRigidCommands([...existing.map(p => p.description || p.name), ...excelSheet.rows.map(r => r.name)])\n      for (const row of excelSheet.rows) {\n        const parsed = parseCutDescription(row.name, row.length, row.width, row.quantity, target.thickness_mm, rigid)\n        await createCutPiece(company.id, target.id, { name: row.name, description: row.name, quantity: row.quantity, length_mm: row.length, width_mm: row.width, thickness_mm: target.thickness_mm, ...parsed })\n      }\n    }\n    await loadSheets()\n    window.alert('Archivo importado correctamente.')\n  }\n  async function exportExcelFile() {\n    if (!sheets.length) { window.alert('No hay hojas para exportar.'); return }\n    const payload = await Promise.all(sheets.map(async s => {\n      const rows = await listCutPieces(s.id)\n      return { name: s.name, rows: rows.map(p => ({ quantity: p.quantity, name: p.description || p.name, length: p.length_mm, width: p.width_mm })) }\n    }))\n    exportCutWorkbook(payload, \`Maderoom_Cortes_${project.name.replace(/[^a-z0-9_-]+/gi, '_')}.xlsx\`)\n  }`)
      }

      const oldToolbar = `<section className="page-card toolbar-card"><div><span className="eyebrow">{project.name}</span><h2>Tabla de cortes</h2></div><div className="inline-form"><input value={newSheet} onChange={(e) => setNewSheet(e.target.value)} placeholder="Color/hoja"/><button className="secondary-button" onClick={addSheet}><Plus size={15}/> Hoja</button><button className="secondary-button" onClick={reparseAll}><RefreshCw size={15}/> Leer descripción</button></div></section>`
      const newToolbar = `<section className="page-card toolbar-card"><div><span className="eyebrow">{project.name}</span><h2>Tabla de cortes</h2></div><div className="inline-form"><input value={newSheet} onChange={(e) => setNewSheet(e.target.value)} placeholder="Color/hoja"/><button className="secondary-button" onClick={addSheet}><Plus size={15}/> Nueva hoja</button><button className="secondary-button" onClick={renameCurrentSheet} disabled={!sheet}>Renombrar hoja</button><button className="secondary-button" onClick={reparseAll}><RefreshCw size={15}/> Leer descripción</button><button className="secondary-button" onClick={createBaseCutWorkbook}>Crear archivo base</button><button className="secondary-button" onClick={() => document.getElementById('cut-excel-import')?.click()}>Importar Excel</button><button className="secondary-button" onClick={exportExcelFile}>Exportar Excel</button><input id="cut-excel-import" type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={async e => { const file=e.target.files?.[0]; if(file) await importExcelFile(file); e.currentTarget.value='' }}/></div></section>`
      if (next.includes(oldToolbar)) next = next.replace(oldToolbar, newToolbar)

      return next === code ? null : { code: next, map: null }
    },
  }
}

export default defineConfig({
  plugins: [maderoomSourcePatches(), react()],
  base: '/maderoom-studio-online/',
  build: { sourcemap: true },
})

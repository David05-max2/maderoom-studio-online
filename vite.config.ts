import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Temporary source guard for a React effect in ProjectsPage.
 * The original effect passed an async-returning loader directly to useEffect,
 * so React treated the returned Promise as a cleanup function and crashed
 * when the Projects screen unmounted after opening a project.
 */
function fixPromiseEffectCleanup(): Plugin {
  return {
    name: 'maderoom-fix-promise-effect-cleanup',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/App.tsx')) return null

      const broken = 'useEffect(load, [company.id])'
      const fixed = 'useEffect(() => { void load() }, [company.id])'

      if (!code.includes(broken)) return null

      return {
        code: code.replace(broken, fixed),
        map: null,
      }
    },
  }
}

export default defineConfig({
  plugins: [fixPromiseEffectCleanup(), react()],
  base: '/maderoom-studio-online/',
})

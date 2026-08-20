import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Build-time safety patch for React effects that accidentally return Promises.
 * In ProjectsPage, passing load directly to useEffect makes React treat the
 * Promise returned by load() as a cleanup function when leaving the screen.
 */
function fixPromiseEffectCleanup(): Plugin {
  return {
    name: 'maderoom-fix-promise-effect-cleanup',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/App.tsx')) return null

      let next = code
      next = next.split('useEffect(load, [company.id])').join('useEffect(() => { void load() }, [company.id])')

      return next === code ? null : { code: next, map: null }
    },
  }
}

export default defineConfig({
  plugins: [fixPromiseEffectCleanup(), react()],
  base: '/maderoom-studio-online/',
  build: {
    sourcemap: true,
  },
})

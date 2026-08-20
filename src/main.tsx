import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './functional.css'

type ErrorBoundaryState = { error: Error | null }

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Maderoom Studio runtime error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#f6f7f8',fontFamily:'Inter,system-ui,sans-serif'}}>
          <section style={{width:'min(680px,100%)',background:'#fff',border:'1px solid #e5e7eb',borderRadius:22,padding:28,boxShadow:'0 18px 50px rgba(0,0,0,.08)'}}>
            <div style={{fontSize:12,fontWeight:800,letterSpacing:1.4,color:'#7b2d2d'}}>MADEROOM STUDIO · ERROR CONTROLADO</div>
            <h1 style={{margin:'10px 0 8px',fontSize:28}}>Este módulo presentó un error.</h1>
            <p style={{color:'#667085',lineHeight:1.5}}>La aplicación ya no quedará en blanco. Puedes volver al inicio y el mensaje de abajo nos permite localizar exactamente qué botón o módulo falló.</p>
            <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',background:'#f8fafc',padding:16,borderRadius:14,border:'1px solid #e5e7eb',fontSize:13}}>{this.state.error.message}</pre>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:18}}>
              <button onClick={() => this.setState({error:null})} style={{border:0,borderRadius:12,padding:'12px 16px',fontWeight:700,cursor:'pointer'}}>Reintentar</button>
              <button onClick={() => { window.location.href = '/maderoom-studio-online/' }} style={{border:0,borderRadius:12,padding:'12px 16px',fontWeight:700,cursor:'pointer'}}>Volver al inicio</button>
            </div>
          </section>
        </div>
      )
    }
    return this.props.children
  }
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

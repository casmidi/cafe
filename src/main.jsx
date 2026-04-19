import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Fatal UI error:', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-6 border border-red-100">
            <h1 className="text-lg font-bold text-red-600 mb-2">Aplikasi mengalami error</h1>
            <p className="text-sm text-gray-600 mb-4">Halaman tidak bisa dimuat. Coba refresh dulu. Jika tetap muncul, kirim pesan error ini.</p>
            <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto text-gray-700 whitespace-pre-wrap">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
)
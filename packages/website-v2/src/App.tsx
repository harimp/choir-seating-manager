import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>🎵 Choir Seating Manager v2</h1>
        <span className="beta-badge">BETA</span>
      </header>
      <main className="app-main">
        <div className="welcome-card">
          <h2>Welcome to the Beta!</h2>
          <p>
            This is the new version of Choir Seating Manager, built from scratch
            with improved features and a better user experience.
          </p>
          <p className="note">
            Production version is available at{' '}
            <a href="https://choir.harimp.com">choir.harimp.com</a>
          </p>
        </div>
      </main>
    </div>
  )
}

export default App

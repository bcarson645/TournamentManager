export default function Home() {
  return (
    <main
      style={{
        margin: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: '#e8e8e8',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '3rem',
          borderRadius: '1rem',
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
          Hello, World!
        </h1>
        <p style={{ margin: 0, opacity: 0.85, fontSize: '1.1rem' }}>
          Welcome to TournamentManager.
        </p>
      </div>
    </main>
  )
}

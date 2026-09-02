import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div>
      <header
        style={{
          padding: '20px 40px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0 }}>ZameenAI</h2>

        <span style={{ color: '#6b7280' }}>
          AI-Powered Land Record System
        </span>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  )
}
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

const stats = [
  { value: '12,400+', label: 'Records digitized' },
  { value: '98.6%', label: 'Extraction accuracy' },
  { value: '40', label: 'Districts covered' },
  { value: '3.2s', label: 'Avg. processing time' },
]

function HomePage() {
  return (
    <div>
      <div
        style={{
          minHeight: 'calc(100vh - 73px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <div
          style={{
            maxWidth: '800px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#6b7280',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            ZameenAI
          </p>

          <h1
            style={{
              fontSize: '48px',
              margin: '12px 0',
            }}
          >
            AI-Powered Land Record Digitization
          </h1>

          <p
            style={{
              fontSize: '18px',
              lineHeight: 1.6,
              color: '#6b7280',
            }}
          >
            Digitize, process, extract, validate and manage
            land-record documents using AI.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              marginTop: '32px',
            }}
          >
            <button
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '15px',
              }}
            >
              Start Digitization
            </button>

            <button
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                background: 'white',
                cursor: 'pointer',
                fontSize: '15px',
              }}
            >
              View Documents
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          padding: '48px 40px',
        }}
      >
        <div
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '0 16px',
                borderLeft: i === 0 ? 'none' : '1px solid #e5e7eb',
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: '#1a2942',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginTop: '4px',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
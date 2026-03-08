'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: '#030712', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>💎</div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>GemBots Arena</h2>
            <p style={{ color: '#9ca3af', marginBottom: '32px' }}>
              Something went wrong. Please refresh the page.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(to right, #9945FF, #14F195)',
                color: '#fff',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

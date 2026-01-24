/**
 * Error boundary fallback components
 */

/**
 * ErrorFallback - For granular error boundaries (modals, sections)
 * Compact inline error card with retry option
 */
export function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div
      role="alert"
      style={{
        padding: "1rem",
        border: "1px solid var(--border-primary)",
        borderRadius: "0.5rem",
        backgroundColor: "var(--bg-card)",
        color: "var(--text-secondary)",
      }}
    >
      <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: 600 }}>
        Something went wrong
      </h3>
      <pre
        style={{
          margin: "0 0 1rem 0",
          fontSize: "0.875rem",
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: "var(--text-muted)",
        }}
      >
        {error.message}
      </pre>
      <button
        onClick={resetErrorBoundary}
        style={{
          padding: "0.5rem 1rem",
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "white",
          backgroundColor: "var(--color-primary)",
          border: "none",
          borderRadius: "0.375rem",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}

/**
 * RootErrorFallback - For catastrophic failures at the App level
 * Full-screen centered layout with reload option
 */
export function RootErrorFallback({ error }) {
  const isDev = import.meta.env.DEV;

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: "0 0 1rem 0",
            fontSize: "2rem",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          Application Error
        </h1>
        <p
          style={{
            margin: "0 0 2rem 0",
            fontSize: "1.125rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          We're sorry, something went wrong. Please try reloading the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            fontWeight: 600,
            color: "white",
            backgroundColor: "var(--color-primary)",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
          }}
        >
          Reload Page
        </button>
        {isDev && error && (
          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              textAlign: "left",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-primary)",
              borderRadius: "0.5rem",
            }}
          >
            <h3
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Error Details (Development Only)
            </h3>
            <pre
              style={{
                margin: "0 0 1rem 0",
                fontSize: "0.75rem",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "var(--text-muted)",
              }}
            >
              {error.message}
            </pre>
            {error.stack && (
              <pre
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "var(--text-muted)",
                  opacity: 0.7,
                }}
              >
                {error.stack}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

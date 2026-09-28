"use client";

// The last resort: an error in the root layout itself, where even the fonts and stylesheet
// haven't loaded. It has to bring its own <html> and can't rely on anything else, so the
// styles here are inline on purpose.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          color: "#27272a",
          background: "#fafafa",
        }}
      >
        <main style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.5rem" }}>The portal didn&apos;t load</h1>
          <p style={{ margin: "0 0 1.25rem", color: "#52525b" }}>
            Something went wrong at our end. Nothing you&apos;ve saved is affected. Try again in
            a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              borderRadius: "0.5rem",
              border: 0,
              background: "#16a34a",
              color: "white",
              fontWeight: 600,
              padding: "0.5rem 1rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: "1.25rem", fontSize: "0.875rem", color: "#71717a" }}>
              Quote {error.digest} if you get in touch.
            </p>
          )}
        </main>
      </body>
    </html>
  );
}

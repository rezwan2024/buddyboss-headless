"use client";

// Catches an error thrown by the root layout itself (e.g. SiteHeader's
// getSiteInfo() call failing) — the one place app/error.tsx can't reach,
// since an error boundary never covers its own parent. Must render its
// own <html>/<body>, since it replaces the entire root layout tree when
// triggered — no next/font, no <Providers>, nothing that could itself be
// the thing that failed.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center px-4 font-sans">
        <div className="w-full max-w-md text-center">
          <h1 className="text-xl font-semibold text-red-700">Something went wrong</h1>
          <p className="mt-2 text-sm text-black/60">{error.message}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded border border-black/20 px-3 py-1.5 text-sm hover:bg-black/5"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

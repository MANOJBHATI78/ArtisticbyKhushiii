import Link from "next/link";

/**
 * Branded 404 — rendered with a genuine 404 HTTP status by src/app/page.tsx
 * when the requested path is not a known SPA route. Kept as a server
 * component: no client JS needed, instant paint for people and crawlers.
 */
export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-md flex flex-col items-center gap-6">
        {/* Dried-floral heart mark */}
        <div
          className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center"
          aria-hidden="true"
        >
          <span className="font-display text-4xl text-primary">4<span className="text-gold">0</span>4</span>
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-3xl sm:text-4xl text-espresso">
            This piece isn&apos;t on our shelf
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            The page you were looking for has moved, sold out, or never existed.
            Let&apos;s get you back to the handcrafted goodness.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 font-medium text-primary-foreground transition-colors hover:bg-primary/90 w-full sm:w-auto"
          >
            Back to Home
          </Link>
          <Link
            href="/products"
            className="inline-flex h-11 items-center justify-center rounded-full border border-input bg-background px-8 font-medium text-foreground transition-colors hover:bg-secondary w-full sm:w-auto"
          >
            Browse Products
          </Link>
        </div>

        <p className="text-sm text-muted-foreground">
          Looking for something custom?{" "}
          <Link href="/contact" className="text-primary underline underline-offset-4 hover:text-primary/80">
            Tell us what you imagine
          </Link>
        </p>
      </div>
    </main>
  );
}

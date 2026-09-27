"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Database, ExternalLink, X } from "lucide-react";

interface HealthShape {
  ok: boolean;
  app?: { version?: string };
  db?: { mode?: string; target?: string; error?: string | null };
  fix?: string;
}

/**
 * Shows a warning strip inside the admin panel when the site is running on a
 * TEMPORARY database (no Turso URL + no writable disk — e.g. Netlify without
 * env vars) or when the database is down, so the owner knows changes will not
 * persist and exactly how to fix it.
 */
export function DbModeBanner() {
  const [health, setHealth] = useState<HealthShape | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: HealthShape) => {
        if (alive) setHealth(d);
      })
      .catch(() => {
        /* health endpoint unreachable — stay silent, other UI covers it */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (dismissed || !health) return null;

  const mode = health.db?.mode;
  const temporary = mode === "tmp-fallback";
  const down = health.ok === false;

  if (!temporary && !down) return null;

  return (
    <div
      role="alert"
      className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${
        down
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
      }`}
    >
      {down ? (
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <Database className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {down
            ? "Database not reachable"
            : "Temporary database mode — changes will NOT survive a restart/redeploy"}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed">
          {down
            ? (health.db?.error ?? health.fix ?? "Open /api/health for full diagnostics.")
            : "This host has no permanent database configured. Set DATABASE_URL (libsql://…turso.io) + DATABASE_AUTH_TOKEN in your host's environment variables, then redeploy — see DEPLOYMENT.md."}
        </p>
        <a
          href="/api/health"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2"
        >
          Open /api/health <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss warning"
        className="rounded p-1 opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { SearchX, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLastServerError } from "@/lib/api-client";

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Friendly empty-state block (no raw errors, ever). */
export function EmptyState({ title, message, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-secondary text-terracotta">
        {icon ?? <SearchX className="size-7" aria-hidden="true" />}
      </div>
      <h2 className="font-display text-2xl text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Friendly error state with retry. When the server returned a 5xx, the real
 * reason (e.g. database unreachable) is shown underneath as a compact
 * diagnostics line, plus a link to /api/health — so a live deployment can be
 * debugged from the screen itself.
 */
export function ErrorState({ title = "Something went sideways", message = "We couldn't load this just now. Please try again — handmade things are worth the wait.", onRetry, className }: ErrorStateProps) {
  const serverDetail = getLastServerError();
  return (
    <EmptyState
      className={className}
      title={title}
      message={message}
      action={
        <div className="flex flex-col items-center gap-4">
          {onRetry ? (
            <Button variant="outline" className="h-11" onClick={onRetry}>
              <RefreshCcw aria-hidden="true" />
              Try Again
            </Button>
          ) : null}
          {serverDetail ? (
            <div
              role="note"
              className="mx-auto max-w-lg rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-left"
            >
              <p className="text-[11px] leading-relaxed font-mono break-words text-destructive/90">
                <span className="font-semibold">Server said: </span>
                {serverDetail}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Full diagnostics:{" "}
                <a
                  href="/api/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2 hover:text-foreground"
                >
                  open /api/health
                </a>
              </p>
            </div>
          ) : null}
        </div>
      }
    />
  );
}

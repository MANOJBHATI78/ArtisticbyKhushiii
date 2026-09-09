"use client";

import type { ReactNode } from "react";
import { SearchX, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

/** Friendly error state with retry. */
export function ErrorState({ title = "Something went sideways", message = "We couldn't load this just now. Please try again — handmade things are worth the wait.", onRetry, className }: ErrorStateProps) {
  return (
    <EmptyState
      className={className}
      title={title}
      message={message}
      action={
        onRetry ? (
          <Button variant="outline" className="h-11" onClick={onRetry}>
            <RefreshCcw aria-hidden="true" />
            Try Again
          </Button>
        ) : null
      }
    />
  );
}

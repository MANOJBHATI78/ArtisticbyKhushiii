"use client";

import type { ApiResponse } from "@/lib/types";

/**
 * Thin fetch wrapper for the SPA. All responses follow
 * the { ok: true, data } | { ok: false, error } envelope.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ---------------- server error tracking (diagnostics) ----------------
// The last error the server actually returned. Error screens read this to
// show WHY things failed on a live site (e.g. database unreachable) instead
// of a generic "something went wrong".

let lastServerError: string | null = null;

export function getLastServerError(): string | null {
  return lastServerError;
}

export function clearLastServerError(): void {
  lastServerError = null;
}

function recordServerError(message: string): void {
  lastServerError = message;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers || {}),
    },
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    recordServerError(`Request failed (${res.status})`);
    throw new ApiError(`Request failed (${res.status})`, res.status);
  }

  if (!payload || payload.ok !== true) {
    const msg = payload && "error" in payload ? payload.error : `Request failed (${res.status})`;
    // Only server-side failures (5xx) are worth surfacing as diagnostics.
    if (res.status >= 500) recordServerError(msg);
    throw new ApiError(msg, res.status);
  }
  return payload.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
};

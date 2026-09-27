"use client";

import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Lock, LogIn, Mail, ShieldAlert } from "lucide-react";
import { useAdminAuth } from "./useAdminAuth";
import { errMsg } from "./admin-utils";

// ============================================================
// Studio Console login — centered brand card.
// ============================================================

export default function AdminLogin() {
  const { login, loginPending } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    try {
      await login(email.trim(), password);
      // "me" query invalidation triggers the gate to render the layout.
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, oklch(0.93 0.03 82) 0%, oklch(0.968 0.014 85) 45%, oklch(0.95 0.02 80) 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          { }
          <img
            src="/images/logo.png"
            alt="Artistic by Khushiii logo"
            width={64}
            height={64}
            className="rounded-xl border border-gold/40 shadow-sm"
          />
          <div>
            <h1 className="font-display text-2xl font-semibold text-primary">Studio Console</h1>
            <p className="text-sm text-muted-foreground">Artistic by Khushiii · website manager</p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border bg-card p-6 shadow-lg shadow-primary/5"
          noValidate
        >
          <div className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-email"
                  ref={emailRef}
                  autoFocus
                  type="email"
                  autoComplete="username"
                  placeholder="you@artisticbykhushi.com"
                  className="pl-8"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-8 pr-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loginPending}>
              {loginPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              {loginPending ? "Signing in…" : "Sign in"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">Owner access only</p>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground/70">
          © Artistic by Khushiii — handcrafted resin art studio
        </p>
      </div>
    </main>
  );
}

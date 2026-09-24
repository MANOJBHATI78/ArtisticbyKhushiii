"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { AdminUserRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Save,
  ShieldCheck,
  Trash2,
  UserCircle,
  UserPlus,
  Users as UsersIcon,
} from "lucide-react";
import { useAdminMe, useAdminUsers } from "./useAdminData";
import { ConfirmDialog, EmptyState, Field, Spinner } from "./shared";
import { errMsg } from "./admin-utils";

// ============================================================
// Users & Roles — OWNER-only module. Team members, passwords,
// enable/disable and logins for the Studio Console.
// ============================================================

type Role = AdminUserRow["role"]; // "OWNER" | "ADMIN" | "VIEWER"

const ROLE_META: Record<Role, { label: string; badge: string; desc: string }> = {
  OWNER: {
    label: "Owner",
    badge: "border-gold/40 bg-gold-soft text-espresso",
    desc: "Full access incl. users & settings",
  },
  ADMIN: {
    label: "Admin",
    badge: "border-terracotta/30 bg-terracotta/15 text-terracotta-deep",
    desc: "Everything except user management",
  },
  VIEWER: {
    label: "Viewer",
    badge: "bg-muted text-muted-foreground border-border",
    desc: "Read-only — dashboard and lists",
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wide ${ROLE_META[role].badge}`}>
      {ROLE_META[role].label}
    </Badge>
  );
}

/** Green pulse when the member has live console sessions. */
function OnlineIndicator({ count }: { count: number }) {
  if (!count) return <span className="text-xs text-muted-foreground/60">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700" title={`${count} active session${count === 1 ? "" : "s"}`}>
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-green-600" />
      </span>
      {count} active session{count === 1 ? "" : "s"}
    </span>
  );
}

function fmtDay(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM yyyy");
  } catch {
    return "—";
  }
}

export function UsersManager() {
  const { data: users, isLoading, isError, error } = useAdminUsers();
  const { data: me } = useAdminMe();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<AdminUserRow | null>(null);
  const [toggling, setToggling] = useState<AdminUserRow | null>(null);
  const [deleting, setDeleting] = useState<AdminUserRow | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [togglePending, setTogglePending] = useState(false);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ["admin", "users"] });
  }

  function confirmToggle() {
    if (!toggling) return;
    const target = toggling;
    const nextActive = !target.active;
    setTogglePending(true);
    api
      .put(`/api/admin/users/${target.id}`, { active: nextActive })
      .then(() => {
        toast({
          title: nextActive ? "Account enabled" : "Account disabled",
          description: nextActive
            ? `${target.name} can log in again.`
            : `${target.name} can no longer log in${target.sessionCount ? " and was logged out immediately." : "."}`,
        });
        setToggling(null);
        invalidate();
      })
      .catch((e) => toast({ title: "Update failed", description: errMsg(e), variant: "destructive" }))
      .finally(() => setTogglePending(false));
  }

  function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeletePending(true);
    api
      .delete(`/api/admin/users/${target.id}`)
      .then(() => {
        toast({ title: "Team member removed", description: `${target.name} (${target.email}) was deleted.` });
        setDeleting(null);
        invalidate();
      })
      .catch((e) => toast({ title: "Delete failed", description: errMsg(e), variant: "destructive" }))
      .finally(() => setDeletePending(false));
  }

  // ---- non-OWNER / API error friendly state ----
  if (isError) {
    const forbidden = errMsg(error).toLowerCase().includes("owner");
    return (
      <EmptyState
        icon={<ShieldCheck className="h-8 w-8 text-muted-foreground/50" />}
        title={forbidden ? "Owner-only area" : "Couldn't load the team"}
        hint={
          forbidden
            ? "Users & Roles can only be managed by an OWNER account. Ask the studio owner to make these changes."
            : `${errMsg(error)} — try refreshing.`
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Who can open the Studio Console — and how much they can change. Email is the login ID for each member.
        </p>
        <Button onClick={() => setAdding(true)}>
          <UserPlus className="mr-1 h-4 w-4" /> Add team member
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : (users ?? []).length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="h-8 w-8 text-muted-foreground/50" />}
          title="No team members yet"
          hint="Add an account for a family member or designer so they can help manage the studio."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden max-h-[70vh] overflow-auto custom-scroll rounded-lg border md:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-1/3">Member</TableHead>
                  <TableHead className="w-24">Role</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-36">Sessions</TableHead>
                  <TableHead className="w-28">Joined</TableHead>
                  <TableHead className="w-40 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users ?? []).map((u) => (
                  <TableRow key={u.id} className={u.active ? "" : "opacity-60"}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            u.role === "OWNER" ? "bg-gold-soft text-espresso" : "bg-primary/10 text-primary"
                          }`}
                          aria-hidden="true"
                        >
                          {u.name
                            .split(/\s+/)
                            .map((w) => w[0])
                            .filter(Boolean)
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() || "?"}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-medium">
                            {u.name}
                            {me?.id === u.id ? (
                              <Badge variant="outline" className="text-[9px] text-muted-foreground">
                                You
                              </Badge>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={u.role} />
                    </TableCell>
                    <TableCell>
                      {u.active ? (
                        <Badge variant="outline" className="border-green-300 bg-green-100 text-green-800">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <OnlineIndicator count={u.sessionCount ?? 0} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDay(u.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(u)} aria-label={`Edit ${u.name}`} title="Edit name, email or role">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setResetting(u)} aria-label={`Reset password for ${u.name}`} title="Reset password">
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setToggling(u)}
                          aria-label={u.active ? `Disable ${u.name}` : `Enable ${u.name}`}
                          title={u.active ? "Disable account" : "Enable account"}
                        >
                          <UserCircle className={`h-4 w-4 ${u.active ? "text-green-700" : "text-muted-foreground/50"}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleting(u)}
                          aria-label={`Delete ${u.name}`}
                          title="Delete member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {(users ?? []).map((u) => (
              <Card key={u.id} className={u.active ? "" : "opacity-70"}>
                <CardContent className="space-y-1.5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-medium">
                        {u.name}
                        {me?.id === u.id ? (
                          <Badge variant="outline" className="text-[9px] text-muted-foreground">
                            You
                          </Badge>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <RoleBadge role={u.role} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {u.active ? (
                      <Badge variant="outline" className="border-green-300 bg-green-100 text-green-800">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        Disabled
                      </Badge>
                    )}
                    <OnlineIndicator count={u.sessionCount ?? 0} />
                    <span>joined {fmtDay(u.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button variant="outline" size="sm" className="h-8 flex-1" onClick={() => setEditing(u)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 flex-1" onClick={() => setResetting(u)}>
                      <KeyRound className="mr-1 h-3.5 w-3.5" /> Password
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 flex-1"
                      onClick={() => setToggling(u)}
                      aria-label={u.active ? `Disable ${u.name}` : `Enable ${u.name}`}
                    >
                      {u.active ? "Disable" : "Enable"}
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(u)} aria-label={`Delete ${u.name}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ---- dialogs ---- */}
      {adding ? <UserFormDialog user={null} onClose={() => setAdding(false)} onSaved={invalidate} /> : null}
      {editing ? <UserFormDialog user={editing} onClose={() => setEditing(null)} onSaved={invalidate} /> : null}
      {resetting ? <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} onSaved={invalidate} /> : null}

      {/* enable / disable confirm */}
      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(o) => !o && setToggling(null)}
        title={toggling?.active ? `Disable ${toggling?.name ?? ""}?` : `Enable ${toggling?.name ?? ""}?`}
        description={
          toggling?.active
            ? `They won't be able to log in until you enable them again.${
                (toggling?.sessionCount ?? 0) > 0 ? " They will be logged out immediately." : ""
              }`
            : "They'll be able to log in again with their email and password."
        }
        confirmLabel={toggling?.active ? "Disable account" : "Enable account"}
        destructive={!!toggling?.active}
        onConfirm={confirmToggle}
        pending={togglePending}
      />

      {/* delete confirm */}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? ""}?`}
        description={`“${deleting?.email ?? ""}” will be permanently removed from the Studio Console. This cannot be undone.`}
        confirmLabel="Delete member"
        onConfirm={confirmDelete}
        pending={deletePending}
      />
    </div>
  );
}

// ============================================================
// Add / edit team member dialog
// ============================================================

function UserFormDialog({ user, onClose, onSaved }: { user: AdminUserRow | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !user;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("ADMIN");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const initRef = useRef(false);

  useEffect(() => {
    if (user && !initRef.current) {
      initRef.current = true;
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
    }
    if (!user) initRef.current = true;
  }, [user]);

  const nameError = submitted && name.trim().length < 2 ? "Please enter their name (at least 2 characters)." : undefined;
  const emailError = submitted && !EMAIL_RE.test(email.trim()) ? "Please enter a valid email — this is their login ID." : undefined;
  const passwordError = submitted && isNew && password.length < 8 ? "Password must be at least 8 characters." : undefined;

  async function save() {
    setSubmitted(true);
    if (name.trim().length < 2 || !EMAIL_RE.test(email.trim()) || (isNew && password.length < 8)) {
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await api.post("/api/admin/users", { name: name.trim(), email: email.trim(), password, role });
        toast({ title: "Team member added", description: `${name.trim()} can now log in with this email and password.` });
      } else {
        await api.put(`/api/admin/users/${user.id}`, { name: name.trim(), email: email.trim(), role });
        toast({ title: "Member updated", description: name.trim() });
      }
      onSaved();
      onClose();
    } catch (e) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle className="font-display">{isNew ? "Add team member" : `Edit ${user?.name ?? ""}`}</DialogTitle>
          <DialogDescription>
            {isNew ? "Create a login for a family member, designer or helper." : "Update their name, login email or role."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name" required error={nameError}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Khushi Patel" aria-required />
            </Field>
            <Field label="Email (login ID)" required error={emailError} hint="They'll use this to sign in.">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="khushi@example.com" aria-required autoComplete="off" />
            </Field>
          </div>

          {isNew ? (
            <Field label="Password" required error={passwordError} hint="At least 8 characters — share it with them privately; they can change it under “My Account”.">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="minimum 8 characters"
                  className="pr-10"
                  aria-required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          ) : null}

          <Field label="Role" hint={ROLE_META[role].desc}>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger aria-label="Role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_META) as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_META[r].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-primary" />
              {ROLE_META[role].label}: {ROLE_META[role].desc}.
            </p>
          </Field>

          {!isNew && user?.role === "OWNER" && role !== "OWNER" ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Demoting an OWNER removes their access to users & settings. Another active OWNER must exist — you'll be
              told if this is the only one.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Spinner className="mr-1" /> : <Save className="mr-1 h-4 w-4" />}
            {saving ? "Saving…" : isNew ? "Add member" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Reset password dialog
// ============================================================

function ResetPasswordDialog({ user, onClose, onSaved }: { user: AdminUserRow; onClose: () => void; onSaved: () => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const passwordError = submitted && password.length < 8 ? "Password must be at least 8 characters." : undefined;

  async function save() {
    setSubmitted(true);
    if (password.length < 8) return;
    setSaving(true);
    try {
      await api.put(`/api/admin/users/${user.id}`, { newPassword: password });
      toast({
        title: "Password reset",
        description: `${user.name}'s new password is set — they'll use it next time they log in (their other devices were logged out).`,
      });
      onSaved();
      onClose();
    } catch (e) {
      toast({ title: "Reset failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Reset password — {user.name}</DialogTitle>
          <DialogDescription>
            Set a new password for {user.email}. They stay logged in on this change, but their other devices are logged out.
          </DialogDescription>
        </DialogHeader>

        <Field label="New password" required error={passwordError} hint="At least 8 characters.">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="minimum 8 characters"
              className="pr-10"
              aria-required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Spinner className="mr-1" /> : <KeyRound className="mr-1 h-4 w-4" />}
            {saving ? "Saving…" : "Set new password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

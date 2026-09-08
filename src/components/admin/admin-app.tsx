"use client";

import { useEffect, useState } from "react";
import { Providers } from "@/components/providers";

/**
 * Admin panel application — rendered for #/admin* routes.
 * Owns login, dashboard and all CRUD modules. Built by Task 3-b.
 */
export default function AdminApp() {
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 300);
    return () => clearTimeout(t);
  }, []);

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-display text-xl text-primary">Artistic by Khushi — Studio Console</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="font-display text-xl text-primary">Studio Console</p>
        <p className="text-sm text-muted-foreground mt-2">Admin panel is being assembled (Task 3-b).</p>
      </div>
    </div>
  );
}

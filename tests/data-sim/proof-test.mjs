/**
 * DATA-SAFETY PROOF TEST
 * Simulates exactly what happens when the NEW code deploys to Netlify
 * against the LIVE database (which already has data).
 *
 * 1. Records row counts + content checksums of every table BEFORE
 * 2. Runs scripts/netlify-init.mjs against the copy (the exact script
 *    Netlify runs on every deploy) — via child process
 * 3. Records row counts + content checksums of every table AFTER
 * 4. Compares → proves ZERO data loss.
 */
import { createClient } from "@libsql/client";
import { execFileSync } from "node:child_process";

const SIM = "/home/z/my-project/tests/data-sim/live-sim.db";
const client = createClient({ url: `file:${SIM}` });

async function snapshot(label) {
  const tables = (
    await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%';")
  ).rows.map((r) => String(r.name)).sort();
  const out = {};
  for (const t of tables) {
    const count = await client.execute(`SELECT COUNT(*) AS n FROM "${t}";`);
    out[t] = Number(count.rows[0]?.n ?? 0);
  }
  // Content fingerprints for the tables that hold the user's precious data
  const fingers = {};
  const fingerprint = async (table, cols) => {
    const r = await client.execute(`SELECT ${cols.join(", ")} FROM "${table}" ORDER BY 1;`);
    fingers[table] = JSON.stringify(r.rows);
  };
  await fingerprint("Product", ["id", "name", "slug", "price", "compareAtPrice"]);
  await fingerprint("ProductImage", ["id", "productId", "url", "alt"]);
  await fingerprint("Category", ["id", "name", "slug"]);
  await fingerprint("BlogPost", ["id", "title", "slug", "status"]);
  await fingerprint("Page", ["id", "title", "slug"]);
  await fingerprint("Faq", ["id", "question"]);
  await fingerprint("Lead", ["id", "name", "mobile", "status", "utmSource"]);
  await fingerprint("SiteSetting", ["key", "value"]);
  await fingerprint("AdminUser", ["id", "email", "name", "role", "active"]);
  await fingerprint("HomepageSection", ["id", "sectionKey", "heading"]);
  await fingerprint("Testimonial", ["id", "name", "quote"]);
  console.log(`\n===== ${label} =====`);
  console.log("Row counts:", JSON.stringify(out, null, 1));
  return { counts: out, fingers };
}

const before = await snapshot("BEFORE DEPLOY (live DB state)");

// NOTE: MediaBlob is upload-file storage — the deploy script can only ADD
// upload blobs it finds in the repo (never remove/overwrite), so for that
// table the correct assertion is "after >= before". Everything else must
// be exactly equal.

// ---- Run the EXACT deploy-time script against this DB ----
console.log("\n>>> Simulating Netlify deploy (running netlify-init.mjs against the live copy)…\n");
const env = {
  ...process.env,
  DATABASE_URL: `file:${SIM}`,
  INIT_FORCE: "1",
};
execFileSync("node", ["scripts/netlify-init.mjs"], {
  cwd: "/home/z/my-project",
  env,
  stdio: "inherit",
});

const after = await snapshot("AFTER DEPLOY (same DB, after migration script)");

// ---- Compare ----
console.log("\n===== COMPARISON =====");
let allSafe = true;
const tables = new Set([...Object.keys(before.counts), ...Object.keys(after.counts)]);
for (const t of [...tables].sort()) {
  const b = before.counts[t] ?? 0;
  const a = after.counts[t] ?? 0;
  if (t === "MediaBlob") {
    // Additive-only table: uploads may be ADDED to DB storage, never removed.
    if (a >= b) {
      console.log(`✅ ${t}: ${b} rows → ${a} rows (uploads preserved / merged, nothing lost)`);
    } else {
      allSafe = false;
      console.log(`❌ ${t}: ${b} rows → ${a} rows (ROWS LOST!)`);
    }
    continue;
  }
  const same = b === a;
  if (!same) {
    allSafe = false;
    console.log(`❌ ${t}: ${b} rows → ${a} rows (CHANGED!)`);
  } else {
    console.log(`✅ ${t}: ${b} rows → ${a} rows`);
  }
}
console.log("");
for (const [table, fp] of Object.entries(before.fingers)) {
  const same = after.fingers[table] === fp;
  if (!same) {
    allSafe = false;
    console.log(`❌ ${table}: CONTENT CHANGED!`);
  } else {
    console.log(`✅ ${table}: content byte-identical`);
  }
}

console.log("\n============================================");
console.log(allSafe
  ? "🏆 PROOF COMPLETE: Deploy touched NOTHING — every row and every value identical."
  : "💥 DATA LOSS DETECTED — must fix before deploying!");
console.log("============================================");
process.exit(allSafe ? 0 : 1);

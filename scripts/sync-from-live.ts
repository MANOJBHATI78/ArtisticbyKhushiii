/**
 * Pull ALL content from the LIVE site into the local/dev database.
 *
 *   bun scripts/sync-from-live.ts
 *   bun scripts/sync-from-live.ts https://artisticbykhushiii.com
 *   ABK_SYNC_EMAIL=... ABK_SYNC_PASSWORD=... bun scripts/sync-from-live.ts
 *
 * Flags: --no-media (skip image download) · --no-leads (skip inquiries)
 *
 * Why: the owner edits content on the live site (Turso). This script mirrors
 * those changes into any other database so development always happens on top
 * of the REAL content — nothing is ever lost or redone manually.
 */
import { pullFromLive } from "../src/lib/content-sync";

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const flags = new Set(args.filter((a) => a.startsWith("--")));

const source = positional[0] ?? process.env.ABK_SYNC_SOURCE ?? "https://artisticbykhushiii.com";

async function main() {
  console.log(`\n⟡  Pulling content from ${source} …\n`);
  const report = await pullFromLive(source, {
    includeMedia: !flags.has("--no-media"),
    includeLeads: !flags.has("--no-leads"),
    timeoutMs: 30_000,
  });

  const c = report.counts;
  console.log("  ✓ Settings:        ", c.settings);
  console.log("  ✓ Categories:       ", c.categories);
  console.log("  ✓ Blog categories:  ", c.blogCategories);
  console.log("  ✓ Products:         ", c.products, `(images: ${c.productImages})`);
  console.log("  ✓ Blog posts:       ", c.blogs);
  console.log("  ✓ Pages:            ", c.pages);
  console.log("  ✓ FAQs:             ", c.faqs);
  console.log("  ✓ Homepage sections:", c.homepageSections);
  console.log("  ✓ Landing pages:    ", c.landingPages);
  console.log("  ✓ Leads:            ", c.leads);
  console.log("  ✓ Media assets:     ", c.mediaAssets);
  console.log(`  ⟡  Media files:      ${report.media.downloaded} downloaded, ${report.media.skipped} already present, ${report.media.failed} failed`);

  if (report.warnings.length > 0) {
    console.log("\n  ⚠ Warnings:");
    for (const w of report.warnings.slice(0, 10)) console.log("   -", w);
  }
  console.log(`\n✅ Sync complete in ${((new Date(report.finishedAt).getTime() - new Date(report.startedAt).getTime()) / 1000).toFixed(1)}s\n`);
  process.exit(0);
}

main().catch((e) => {
  console.error("\n❌ Sync failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});

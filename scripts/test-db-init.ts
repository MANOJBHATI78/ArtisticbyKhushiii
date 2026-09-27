/**
 * Standalone verification of src/lib/db.ts auto-bootstrap paths.
 * Usage (env wins over .env):
 *   bun scripts/test-db-init.ts                          → normal dev file mode
 *   DATABASE_URL=file:/tmp/abk-qa/fresh.db bun scripts/test-db-init.ts  → fresh file + seed
 *   cd /tmp && DATABASE_URL= bun /home/z/my-project/scripts/test-db-init.ts → no repo db nearby
 */
import { APP_VERSION, db, getDbInfo } from "../src/lib/db";

console.log("APP_VERSION:", APP_VERSION);
const info = getDbInfo();
console.log("DB info:", JSON.stringify(info, null, 2));

const products = await db.product.count();
const categories = await db.category.count();
const blogs = await db.blogPost.count();
const users = await db.adminUser.count();
const settings = await db.siteSetting.count();
console.log(
  `counts → products:${products} categories:${categories} blogs:${blogs} adminUsers:${users} settings:${settings}`,
);

if (users === 0) throw new Error("FAIL: no admin user after init");
if (products === 0) throw new Error("FAIL: no products after init");

// Login-style write round-trip (session create + delete).
const user = await db.adminUser.findFirstOrThrow();
const s = await db.adminSession.create({
  data: {
    token: `qa-${Date.now()}`,
    userId: user.id,
    expiresAt: new Date(Date.now() + 86_400_000),
  },
});
await db.adminSession.delete({ where: { id: s.id } });
console.log("session create/delete round-trip: OK");

console.log("\n✅ test-db-init PASSED");
process.exit(0);

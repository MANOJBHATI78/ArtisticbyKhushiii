/**
 * One-shot codemod: replace the generic 500 catch message in every API route
 * with a detailed, diagnosable message (uses describeDbError from @/lib/db).
 * Run: bun scripts/enhance-error-messages.ts
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API_DIR = path.join(process.cwd(), "src/app/api");
const OLD = 'return fail("Something went wrong. Please try again.", 500);';
const NEW =
  "return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);";

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (entry.name === "route.ts") out.push(p);
  }
  return out;
}

const routes = await walk(API_DIR);
let changed = 0;

for (const file of routes) {
  let src = await readFile(file, "utf8");
  if (!src.includes(OLD)) continue;

  src = src.replace(OLD, NEW);

  // Ensure describeDbError is imported.
  const dbImport = /^import\s+\{([^}]*)\}\s+from\s+"@\/lib\/db";$/m.exec(src);
  if (dbImport) {
    if (!dbImport[1].includes("describeDbError")) {
      const names = dbImport[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      names.push("describeDbError");
      const replacement = `import { ${names.join(", ")} } from "@/lib/db";`;
      src = src.replace(dbImport[0], replacement);
    }
  } else {
    // Insert a fresh import after the last top import line.
    const importLines = src.match(/^import[^\n]*;\n/gm) ?? [];
    const anchor = importLines.length
      ? importLines[importLines.length - 1]
      : "";
    if (anchor) {
      src = src.replace(
        anchor,
        `${anchor}import { describeDbError } from "@/lib/db";\n`,
      );
    } else {
      src = `import { describeDbError } from "@/lib/db";\n${src}`;
    }
  }

  await writeFile(file, src, "utf8");
  changed += 1;
  console.log("  ✓", path.relative(process.cwd(), file));
}

console.log(`\n${changed} route files updated.`);

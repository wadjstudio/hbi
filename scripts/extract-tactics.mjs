// Reuse the browser's exact rule implementation for local, credential-free batch review.
import { readFile, writeFile, mkdtemp, rm, realpath, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const [input, output, groundPath] = process.argv.slice(2);
if (!input || !output || process.argv.length > 5) throw new Error("Usage: node scripts/extract-tactics.mjs TRACKING_OR_REVIEW.json OUTPUT.json [REVIEWED_GROUND_OR_SPATIAL_PREPARATION.json]");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(await realpath(resolve(root, "node_modules/wrangler/package.json")));
const { build } = require("esbuild");
const temporary = await mkdtemp(join(tmpdir(), "sesen-tactics-"));
async function readJson(path, limit) {
  if ((await stat(path)).size > limit) throw new Error("Input exceeds bounded review size");
  return JSON.parse(await readFile(path, "utf8"));
}
try {
  const modulePath = join(temporary, "rules.mjs");
  await build({ entryPoints: [resolve(root, "features/analysis/tactical-proposals.ts")], outfile: modulePath,
    bundle: true, platform: "node", format: "esm", logLevel: "silent" });
  const { extractTacticalProposals } = await import(pathToFileURL(modulePath).href);
  const source = await readJson(input, 10 * 1024 * 1024);
  if (!["sesen.workbench-tracking.v1", "sesen.tracking-review.v1"].includes(source.schema)) throw new Error("Unsupported tracking/review input");
  const report = source.schema === "sesen.tracking-review.v1" ? source.report : source;
  const additional = groundPath ? await readJson(groundPath, 3 * 1024 * 1024) : undefined;
  const preparation = additional?.schema === "sesen.spatial-preparation.v1" ? additional : source.tactics?.preparation;
  const ground = additional && additional.schema !== "sesen.spatial-preparation.v1" ? additional : source.tactics?.ground;
  const result = extractTacticalProposals(report, source.corrections ?? {}, ground, preparation);
  await writeFile(output, JSON.stringify({ schema: "sesen.tactical-proposals.v1", source: report.source,
    engine: { rule_version: result.rule_version, calibrated_probability: false, tracking_model_sha256: report.engine.model_sha256 },
    evidence_basis: { corrections: source.corrections ?? {}, ground, preparation },
    time_basis: report.time_basis, ...result, decisions: {},
    limitations: ["Review-only rules; no confirmed tactical events, player identities or ball possession", "Rule support is not a calibrated probability"] }, null, 2), { flag: "wx" });
  console.log(`${result.proposals.length} review proposals; defensive evidence ${result.defense_ready ? "provided" : "missing"}; no canonical events written`);
} finally {
  // Only the private directory created by mkdtemp is removed; never the source or output.
  if (dirname(resolve(temporary)) !== resolve(tmpdir()) || !resolve(temporary).startsWith(join(resolve(tmpdir()), "sesen-tactics-")))
    throw new Error("Unsafe temporary cleanup path");
  await rm(temporary, { recursive: true, force: true });
}

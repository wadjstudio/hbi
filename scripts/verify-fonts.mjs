import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("../public/fonts/", import.meta.url));
const manifest = JSON.parse(
  await readFile(resolve(root, "manifest.json"), "utf8"),
);
assert.equal(manifest.faces.length, 6);
assert.equal(manifest.licenses.length, 2);
for (const item of [...manifest.faces, ...manifest.licenses]) {
  const path = resolve(root, item.file);
  assert(
    path.startsWith(resolve(root) + sep),
    "Font asset escaped public/fonts",
  );
  const bytes = await readFile(path);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    item.sha256,
    item.file,
  );
  if (item.file.endsWith(".woff2")) {
    assert.equal(bytes.subarray(0, 4).toString(), "wOF2");
    assert.equal(bytes.length, item.bytes);
    assert.equal(new URL(item.url).origin, "https://fonts.gstatic.com");
  } else {
    assert(bytes.toString().includes("SIL OPEN FONT LICENSE Version 1.1"));
  }
}
const css = await readFile(
  new URL("../app/fonts.css", import.meta.url),
  "utf8",
);
assert(!/https?:\/\//.test(css), "Runtime font CSS must remain local");
for (const face of manifest.faces) assert(css.includes(`/fonts/${face.file}`));
console.log(
  `PASS: ${manifest.faces.length} unmodified WOFF2 files (${manifest.faces.reduce((sum, face) => sum + face.bytes, 0)} bytes), licenses and local-only CSS`,
);

// Deterministic web/icon exports from the approved generated masters; no image service at runtime.
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "public/brand");
const masters = resolve(root, "brand/masters");
await mkdir(output, { recursive: true });
await mkdir(masters, { recursive: true });
const [markInput, lockupInput, kitInput, railInput] = process.argv.slice(2);
for (const [input, name] of [
  [markInput, "mark.png"],
  [lockupInput, "lockup.png"],
]) {
  if (input)
    await writeFile(resolve(masters, name), await readFile(resolve(input)));
}
const mark = await sharp(resolve(masters, "mark.png")).trim().png().toBuffer();
const lockup = await sharp(resolve(masters, "lockup.png"))
  .trim()
  .png()
  .toBuffer();
await sharp(mark)
  .resize(512, 512, { fit: "contain", background: "#00000000" })
  .png()
  .toFile(resolve(output, "sesen-mark.png"));
await sharp(lockup)
  .resize({ width: 1152 })
  .png()
  .toFile(resolve(output, "sesen-lockup.png"));
await sharp(lockup)
  .resize({ width: 768 })
  .webp({ quality: 95 })
  .toFile(resolve(output, "sesen-lockup.webp"));
const background = { r: 8, g: 14, b: 18, alpha: 1 };
async function icon(size, file, fraction) {
  const symbol = await sharp(mark)
    .resize(Math.floor(size * fraction), Math.floor(size * fraction), {
      fit: "inside",
    })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: symbol, gravity: "center" }])
    .png()
    .toFile(resolve(output, file));
}
for (const size of [16, 32, 48, 192, 512])
  await icon(size, `icon-${size}.png`, 0.83);
// All artwork stays within a circle of diameter 80%: a 56% square fits inside it.
for (const size of [192, 512]) await icon(size, `maskable-${size}.png`, 0.56);
await icon(180, "apple-touch-icon.png", 0.77);
const sizes = [16, 32, 48];
const buffers = await Promise.all(
  sizes.map((size) => readFile(resolve(output, `icon-${size}.png`))),
);
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
buffers.forEach((data, i) => {
  const entry = 6 + i * 16;
  header[entry] = sizes[i];
  header[entry + 1] = sizes[i];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(data.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += data.length;
});
await writeFile(
  resolve(output, "favicon.ico"),
  Buffer.concat([header, ...buffers]),
);
await writeFile(
  resolve(root, "public/favicon.ico"),
  Buffer.concat([header, ...buffers]),
);
if (railInput)
  await writeFile(
    resolve(masters, "athlete-rail.png"),
    await readFile(resolve(railInput)),
  );
await sharp(resolve(masters, "athlete-rail.png"))
  .resize({ height: 960 })
  .webp({ quality: 82 })
  .toFile(resolve(output, "athlete-rail.webp"));
const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="line"><stop stop-color="#11D3D7"/><stop offset="1" stop-color="#D8B57B"/></linearGradient></defs><rect width="1200" height="630" fill="#080E12"/><path d="M0 0H1200V630" fill="none" stroke="#263A47" stroke-width="2"/><image x="150" y="145" width="900" height="210" href="data:image/png;base64,${lockup.toString("base64")}"/><rect x="300" y="390" width="600" height="3" fill="url(#line)"/><text x="600" y="457" text-anchor="middle" fill="#B6C4CF" font-family="Arial,sans-serif" font-size="26" letter-spacing="4">HANDBALL INTELLIGENCE</text><text x="600" y="510" text-anchor="middle" fill="#D8B57B" font-family="Arial,sans-serif" font-size="17" letter-spacing="3">ANALYZE · UNDERSTAND · PREPARE</text></svg>`;
await sharp(Buffer.from(social))
  .png()
  .toFile(resolve(output, "social-card.png"));
const imported = [];
if (kitInput) {
  for (const name of [
    "courts/handball-court-full.svg",
    "courts/handball-court-half.svg",
    "placeholders/player-neutral.svg",
    "placeholders/coach-neutral.svg",
    "placeholders/team-neutral.svg",
  ]) {
    const data = await readFile(resolve(kitInput, "assets", name));
    if (
      /<script|<foreignObject|<!DOCTYPE|\son\w+\s*=|(?:href|src)=["'](?:https?:|javascript:)/i.test(
        data.toString(),
      )
    )
      throw new Error(`Unsafe SVG: ${name}`);
    const target = resolve(output, name);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
    imported.push({
      path: `/brand/${name}`,
      source: `SESEN_CODEX_UI_KIT/assets/${name}`,
      sha256: createHash("sha256").update(data).digest("hex"),
    });
  }
  await writeFile(
    resolve(root, "brand/kit-assets.json"),
    JSON.stringify(imported, null, 2) + "\n",
  );
}
for (const file of [
  "sesen-mark.png",
  "sesen-lockup.webp",
  "maskable-512.png",
  "apple-touch-icon.png",
]) {
  const info = await sharp(resolve(output, file)).metadata();
  const stats = await sharp(resolve(output, file)).stats();
  if (file.startsWith("sesen-") && stats.channels[3]?.min !== 0) throw new Error(`${file} lost transparency`);
  if (!file.startsWith("sesen-") && stats.channels[3]?.min !== 255) throw new Error(`${file} must have an opaque background`);
  console.log(
    `${file}: ${info.width}×${info.height}, ${(await stat(resolve(output, file))).size} bytes, alpha=${info.hasAlpha}`,
  );
}

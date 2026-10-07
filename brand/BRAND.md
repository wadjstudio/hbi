# SESEN Sports Intelligence

Final identity supplied by the user on 7 October 2026. Handball Intelligence is the product descriptor; SESEN is the visible name. The original HBI technical identifiers are retained for data compatibility.

Open `preview.html` locally to review exports, favicon sizes, circular masking and palette. This static gallery requests no external resources and contains no match statistics.

## Assets

| Use | File | Notes |
| --- | --- | --- |
| Header/login | public/brand/sesen-lockup.webp | Transparent, 768×163; ivory wordmark/cyan E bars/gold descriptor |
| Download/print reference | public/brand/sesen-lockup.png | Transparent 1152px export; raster, not original vector |
| Independent mark | public/brand/sesen-mark.png | Transparent 512px |
| Browser | public/favicon.ico and public/brand/favicon.ico | 16/32/48 PNG-backed ICO, plus separate PNGs |
| Android/home screen | public/brand/icon-192.png, icon-512.png | Dark opaque background, regular icons |
| Android adaptive mask | public/brand/maskable-192.png, maskable-512.png | Symbol inside a 56% square, within the 80%-diameter safe circle |
| iPhone/iPad | public/brand/apple-touch-icon.png | 180px opaque, OS applies corners |
| Link preview | public/brand/social-card.png | 1200×630 brand-only card; no private match data |
| Decorative rail | public/brand/athlete-rail.webp | Original generated anonymous athlete, decorative only |
| Neutral portraits/court | public/brand/placeholders and courts | User-supplied kit SVGs; sources/checksums in kit-assets.json |

`masters/` retains unchanged imagegen PNG outputs. Re-export with Node 24 and installed project dependencies: `node scripts/build-brand-assets.mjs`. Initial import accepts optional mark PNG, lockup PNG, kit directory and decorative athlete PNG positional paths; only use trusted reviewed inputs. Exports are deterministic derivatives of the masters. Generated raster edges and typography can differ from the reference; these assets are not claimed to be original artwork or production vector masters. Use the master PNG for further vector preparation instead of upscaling an app icon.

## Palette and application

Canvas #080E12; panel #0D161D; raised #14212B; border #263A47; ivory #F4F1E8; secondary #B6C4CF; muted #95A8B6; cyan #11D3D7; gold #D8B57B; gold deep #967042. Gold deep is decorative, not small text. Positive #77DB4B, danger #FF606B, information #459EFF, attack #FF851B. Navigation gold is independent of event meaning. Metallic effects belong to the mark; numeric panels remain quiet.

Tokens adapt the supplied kit in app/sesen.css; semantic asset paths/chart colors live in lib/brand.ts. Existing system fallbacks render Inter/Segoe UI/Arial and Cairo/Tahoma/Arial; no remote font dependency or unbundled font is claimed. The sports mark, court and video are never mirrored. Arabic mirrors shell/navigation placement; chronological axes remain LTR.

Court inner bounds are 400×200 inside the SVG viewBox -12,-4,424,208. The chart maps that image at x=-30,y=-10,width=1060,height=520 inside its existing 1000×500 normalized coordinate surface, preserving recorded locations. The court is schematic, not a certified rules diagram.

## Installation and delivery

The web manifest names SESEN, starts at /overview and requests standalone display. Apple metadata and icon are explicit. Sign-in is still required. Android/desktop installation availability depends on the browser; on iOS use the browser's Add to Home Screen. Device installation/splash appearance requires device verification; static asset checks alone do not prove it. No service worker caches authenticated pages, and this iteration adds no full offline navigation. Existing prepared-match local video/drafts remain available during connection loss.

Primary references: [Next metadata icons](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons), [MDN icon safe zone](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons), [MDN manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest).

## Provenance

Logo/mark: built-in imagegen recreation from the user's SESEN brand board, explicitly requested when no separate logo existed. Athlete: new generated ornamental artwork, not a real match participant. Exact prompts are in GENERATION.md. Imported schematic SVGs are newly authored assets from SESEN_CODEX_UI_KIT; no upstream commercial library was copied. Lucide, Radix and resizable-panel notices remain in public/third-party-ui-notices.txt. Kit demo-match JSON, example heatmap and reference screenshots are excluded from application data/assets. Team/player images stay visibly neutral until legitimate originals are supplied.

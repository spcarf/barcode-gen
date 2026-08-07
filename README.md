# Prafulla's Barcode Generator

A premium barcode + QR generator for RD Life Sciences, deployed on Cloudflare
Pages. Generates barcode images on the fly via a URL — designed to be called
from Excel's `IMAGE()` function.

## Self-contained — no npm install needed at deploy time

The barcode library (bwip-js) is pre-bundled into
`functions/api/vendor-bwipjs.mjs` (a single minified file, ~256 KB gzipped).
The function imports it with a relative path, so Cloudflare does NOT need to run
`npm install` to build the Functions — this avoids the
`Could not resolve "bwip-js"` build error that happens when Cloudflare skips the
build step.

Tested against the actual Cloudflare Workers runtime with bwip-js absent from
node_modules: code128, ean13, qrcode, datamatrix all produce valid PNGs, and
invalid input returns 400.

## What's inside

- `functions/api/barcode.js` — the Cloudflare Pages Function (imports the
  vendored bundle, renders a PNG per request).
- `functions/api/vendor-bwipjs.mjs` — the pre-bundled barcode engine. Do not
  edit by hand.
- `public/index.html` — the branded landing page (RDL palette, logo, live
  preview, copy-ready Excel formula).
- `public/assets/rdl-logo.svg` — the official RDL logo, used unmodified.

## Deploy via GitHub + Cloudflare dashboard (no terminal)

1. **Create a GitHub repo** — github.com → New repository → name `barcode-gen`,
   leave it empty (no README), Create.
2. **Upload the files** — on the empty repo, click "uploading an existing
   file". Unzip this project and drag the whole contents (`public/`,
   `functions/`, `package.json`, `wrangler.toml`, `README.md`, `.gitignore`)
   into the box. Commit changes. Then confirm `functions/api/vendor-bwipjs.mjs`
   and `functions/api/barcode.js` both appear at that path in the repo.
3. **Connect to Cloudflare Pages** — dashboard → Workers & Pages → Create →
   Pages → Connect to Git → pick `barcode-gen`.
   Build settings: Framework preset = None, Build command = blank,
   Build output directory = `public`. Save and Deploy.
   (Build command can stay blank now — the function needs no install.)
4. **Enable the compatibility flag** — project → Settings → Functions →
   Compatibility Flags → add `nodejs_compat` to BOTH Production and Preview →
   Save → redeploy the latest deployment. (PNG encoding uses `node:zlib`, which
   this flag provides. The API errors without it.)
5. **Attach the domain** — project → Custom domains → Set up a custom domain →
   `barcode.drprafulla.com`. Since drprafulla.com is already on Cloudflare, the
   CNAME is added automatically. Wait for it to go Active.
6. **Test** —
   `https://barcode.drprafulla.com/api/barcode?code=123456789012&type=code128`
   should return a barcode image.

To update later, edit files in the GitHub web UI — Cloudflare auto-redeploys.

## Use it in Excel (including Excel for the web)

In any cell, with the value to encode in `A2`:

```
=IMAGE("https://barcode.drprafulla.com/api/barcode?code="&A2&"&type=code128")
```

Drag the fill handle down to barcode a whole column. For QR codes:

```
=IMAGE("https://barcode.drprafulla.com/api/barcode?code="&ENCODEURL(A2)&"&type=qrcode")
```

> Excel's `IMAGE()` supports PNG/JPEG/GIF/BMP/TIFF/ICO/WEBP — not SVG — which is
> why this generator outputs PNG.

## URL parameters

| Param | Required | Default | Notes |
|---|---|---|---|
| `code` | yes | — | Text/number to encode |
| `type` | no | `code128` | code128, ean13, upca, code39, qrcode, datamatrix, pdf417, ean8, upce |
| `scale` | no | `3` | 1–10, image resolution |
| `height` | no | `10` | Bar height (linear barcodes) |
| `includetext` | no | `true` | `false` hides the human-readable text |
| `rotate` | no | `N` | N, R, L, I |

## Rebuilding the vendored bundle (only if you upgrade bwip-js)

```
npm install bwip-js
npx esbuild node_modules/bwip-js/dist/bwip-js-node.mjs --bundle --minify \
  --format=esm --platform=node \
  --external:url --external:zlib --external:stream \
  --outfile=functions/api/vendor-bwipjs.mjs
```

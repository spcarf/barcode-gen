# Prafulla's Barcode Generator

A premium barcode + QR generator for RD Life Sciences, deployed on Cloudflare
Pages. Generates barcode images on the fly via a URL — designed to be called
from Excel's `IMAGE()` function.

Tested against the actual Cloudflare Workers runtime (`wrangler pages dev`):
code128, ean13, qrcode, and datamatrix all confirmed producing valid PNGs, plus
correct 400 handling for missing/invalid input.

## What's inside

- `functions/api/barcode.js` — a Cloudflare Pages Function. On each request it
  renders a barcode with `bwip-js` and returns a PNG.
- `public/index.html` — the branded landing page (RDL palette, logo, live
  preview, copy-ready Excel formula).
- `public/assets/rdl-logo.svg` — the official RDL logo, used unmodified.

## Deploy via GitHub + Cloudflare dashboard (no terminal needed)

Cloudflare's drag-and-drop upload does NOT support Pages Functions, so use the
Git route:

1. **Create a GitHub repo** — github.com → New repository → name it
   `barcode-gen`, leave it empty (no README), Create.
2. **Upload the files** — on the empty repo, click "uploading an existing
   file". Unzip this project and drag the whole contents (`public/`,
   `functions/`, `package.json`, `wrangler.toml`, `README.md`, `.gitignore`)
   into the box. GitHub preserves the folder structure. Commit changes.
3. **Connect to Cloudflare Pages** — Cloudflare dashboard → Workers & Pages →
   Create → Pages → Connect to Git → pick the `barcode-gen` repo.
   Build settings: Framework preset = None, Build command = blank,
   Build output directory = `public`. Save and Deploy.
4. **Enable the compatibility flag** (easy to miss — the API errors without it):
   project → Settings → Functions → Compatibility Flags → add `nodejs_compat`
   to BOTH Production and Preview → Save. Then redeploy the latest deployment.
5. **Attach the domain** — project → Custom domains → Set up a custom domain →
   `barcode.drprafulla.com`. Since drprafulla.com is already on Cloudflare, the
   CNAME is added automatically. Wait for the cert to go Active.
6. **Test** — open
   `https://barcode.drprafulla.com/api/barcode?code=123456789012&type=code128`
   — you should see a barcode image.

To update later, edit files directly in the GitHub web UI — Cloudflare
auto-redeploys on every commit.

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

## Local development

```
npm install
npm run dev
```

## Implementation notes

- Uses `bwip-js/node` — the build whose `toBuffer()` PNG encoder works in the
  Workers runtime.
- Requires `nodejs_compat` (set in `wrangler.toml`) — PNG encoding uses
  `node:zlib`, polyfilled under that flag.
- Images are served with a 1-year immutable cache header since the same
  `code`+params always render the same image.

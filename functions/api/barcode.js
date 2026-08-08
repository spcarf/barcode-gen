import bwipjs from './vendor-bwipjs.mjs';

// Friendly aliases -> bwip-js symbology ids (bcid)
const TYPE_ALIASES = {
  code128: 'code128',
  code39: 'code39',
  ean13: 'ean13',
  ean8: 'ean8',
  upca: 'upca',
  upce: 'upce',
  itf14: 'interleaved2of5',
  qrcode: 'qrcode',
  qr: 'qrcode',
  datamatrix: 'datamatrix',
  pdf417: 'pdf417',
  code93: 'code93',
  codabar: 'rationalizedCodabar',
  'gs1-128': 'gs1-128',
  gs1128: 'gs1-128',
  'ucc-128': 'gs1-128',
  'ean-128': 'gs1-128',
  gs1datamatrix: 'gs1datamatrix',
  'gs1-datamatrix': 'gs1datamatrix',
  gs1qrcode: 'gs1qrcode',
  'gs1-qrcode': 'gs1qrcode',
  gs1qr: 'gs1qrcode',
  databarexpanded: 'databarexpanded',
  'databar-expanded': 'databarexpanded',
  'gs1-databar-expanded': 'databarexpanded',
  gs1databarexpanded: 'databarexpanded',
  databarexpandedstacked: 'databarexpandedstacked',
  'databar-expanded-stacked': 'databarexpandedstacked',
};

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const p = url.searchParams;

  const text = p.get('code') || p.get('text');
  if (!text) {
    return new Response('Missing required "code" parameter, e.g. ?code=12345&type=code128', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const typeParam = (p.get('type') || p.get('bcid') || 'code128').toLowerCase();
  const bcid = TYPE_ALIASES[typeParam] || typeParam; // allow raw bwip-js bcid too

  const scale = clampInt(p.get('scale'), 3, 1, 10);
  const height = clampInt(p.get('height'), 10, 1, 60);
  const includetext = p.get('includetext') !== 'false'; // default true
  const rotateRaw = (p.get('rotate') || 'N').toUpperCase();
  const rotate = ['N', 'R', 'L', 'I'].includes(rotateRaw) ? rotateRaw : 'N';

  try {
    const png = await bwipjs.toBuffer({
      bcid,
      text,
      scale,
      height,
      includetext,
      textxalign: 'center',
      rotate,
      backgroundcolor: 'FFFFFF',
    });

    return new Response(png, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        // Same code + same params always renders the same image, so cache hard.
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(
      `Barcode generation error: ${err.message}\n\nCheck that "type" (${bcid}) is a valid symbology and "code" is valid data for it.`,
      { status: 400, headers: { 'Content-Type': 'text/plain' } }
    );
  }
}

function clampInt(raw, fallback, min, max) {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

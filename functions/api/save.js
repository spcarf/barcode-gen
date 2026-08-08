// Securely forwards a scanned barcode to Baserow.
// The scanner page POSTs JSON: { value, format, timestamp, gs1? }
// Your Baserow token stays server-side as a Cloudflare environment variable.
//
// Set these in: Cloudflare dashboard -> your Pages project -> Settings ->
// Environment variables (and/or Secrets):
//   BASEROW_TOKEN      (required)  your Baserow database API token
//   BASEROW_TABLE_ID   (required)  the numeric table id
//   BASEROW_URL        (optional)  base url, default https://api.baserow.io
//   FIELD_VALUE        (optional)  column name for the code, default "Value"
//   FIELD_FORMAT       (optional)  column name for the type,  default "Format"
//   FIELD_TIME         (optional)  column name for the time,  default "Scanned At"
//
// Your Baserow table should have (at minimum) a text field matching FIELD_VALUE.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Body must be JSON.' }, 400);
  }

  const value = (body && (body.value ?? body.code));
  if (!value) return json({ ok: false, error: 'Missing "value".' }, 400);

  if (!env.BASEROW_TOKEN || !env.BASEROW_TABLE_ID) {
    return json({
      ok: false,
      error: 'Baserow not configured. Set BASEROW_TOKEN and BASEROW_TABLE_ID in the Pages project environment variables.',
    }, 501);
  }

  const base = (env.BASEROW_URL || 'https://api.baserow.io').replace(/\/+$/, '');
  const fValue = env.FIELD_VALUE || 'Value';
  const fFormat = env.FIELD_FORMAT || 'Format';
  const fTime = env.FIELD_TIME || 'Scanned At';

  const row = { [fValue]: String(value) };
  if (body.format) row[fFormat] = String(body.format);
  if (body.timestamp) row[fTime] = String(body.timestamp);

  const url = `${base}/api/database/rows/table/${env.BASEROW_TABLE_ID}/?user_field_names=true`;

  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${env.BASEROW_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(row),
    });
  } catch (e) {
    return json({ ok: false, error: 'Could not reach Baserow: ' + e.message }, 502);
  }

  if (!resp.ok) {
    const detail = await resp.text();
    // Most common cause: a field name in the table doesn't match. Retry with value only.
    if (resp.status === 400 && (body.format || body.timestamp)) {
      const retry = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Token ${env.BASEROW_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fValue]: String(value) }),
      });
      if (retry.ok) return json({ ok: true, note: 'Saved value only; check Format/Time column names.' });
    }
    return json({ ok: false, error: `Baserow ${resp.status}`, detail: detail.slice(0, 300) }, 502);
  }

  return json({ ok: true });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

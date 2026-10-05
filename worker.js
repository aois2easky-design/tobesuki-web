/**
 * TOBESUKI - Cloudflare Workers entry point
 * Static Assets + D1 API
 */

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  },
});

function cors(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

function validDeviceId(value) {
  return typeof value === "string" && value.length >= 16 && value.length <= 128;
}

async function backupGet(request, env) {
  const url = new URL(request.url);
  const deviceId = url.searchParams.get("device");
  if (!validDeviceId(deviceId)) return cors(json({ error: "device パラメータが不正です" }, 400));

  try {
    const row = await env.DB
      .prepare("SELECT store_ids, updated_at FROM stamp_backups WHERE device_id = ?")
      .bind(deviceId)
      .first();

    if (!row) return cors(json({ storeIds: [], updatedAt: null, found: false }));

    let storeIds = [];
    try { storeIds = JSON.parse(row.store_ids); } catch { storeIds = []; }
    return cors(json({ storeIds: Array.isArray(storeIds) ? storeIds : [], updatedAt: row.updated_at, found: true }));
  } catch (error) {
    return cors(json({ error: "復元に失敗しました", detail: String(error) }, 500));
  }
}

async function backupPost(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return cors(json({ error: "JSONの形式が不正です" }, 400)); }

  const { deviceId, storeIds } = body || {};
  if (!validDeviceId(deviceId)) return cors(json({ error: "deviceId が不正です" }, 400));
  if (!Array.isArray(storeIds)) return cors(json({ error: "storeIds は配列である必要があります" }, 400));
  if (storeIds.length > 1000) return cors(json({ error: "storeIds が多すぎます" }, 400));

  const normalized = storeIds.filter((id) => typeof id === "string").slice(0, 1000);

  try {
    await env.DB.prepare(`
      INSERT INTO stamp_backups (device_id, store_ids, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(device_id) DO UPDATE SET
        store_ids = excluded.store_ids,
        updated_at = excluded.updated_at
    `).bind(deviceId, JSON.stringify(normalized)).run();

    return cors(json({ ok: true, count: normalized.length }));
  } catch (error) {
    return cors(json({ error: "バックアップの保存に失敗しました", detail: String(error) }, 500));
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return cors(new Response(null, { status: 204 }));
    }

    if (url.pathname === "/api/backup-stamps") {
      if (!env.DB) return cors(json({ error: "D1 binding DB が設定されていません" }, 500));
      if (request.method === "GET") return backupGet(request, env);
      if (request.method === "POST") return backupPost(request, env);
      return cors(json({ error: "Method Not Allowed" }, 405));
    }

    // /api/* is reserved for server-side routes. Existing application APIs can be
    // added here later without changing the static frontend deployment.
    if (url.pathname.startsWith("/api/")) {
      return cors(json({ error: "API route not implemented" }, 404));
    }

    // Everything else is served by Cloudflare Workers Static Assets.
    return env.ASSETS.fetch(request);
  },
};

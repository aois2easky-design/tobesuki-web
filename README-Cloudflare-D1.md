# TOBESUKI v13 — Cloudflare Workers + D1

この版は Pages Functions の `/functions` 構成から、Cloudflare Workers の「Worker script + Static Assets」構成へ移行しています。

## 1. D1

既存のD1をそのまま使います。

`schema.sql` を既存D1の Console で実行してください。

作成されるテーブル:

- `stamp_backups`

## 2. Workerをデプロイ

Wranglerを使う場合:

```bash
npx wrangler deploy
```

Cloudflare Dashboardから設定する場合は、このプロジェクトをWorkerとしてデプロイしてください。

重要: この版では `worker.js` があるため、以前の「static assets only」Workerではありません。

## 3. D1 Binding

デプロイ後:

Workers & Pages → tobesuki → Settings → Bindings → Add binding → D1 database

Variable name:

```text
DB
```

Database:

```text
作成済みのTOBESUKI用D1
```

を選択して保存してください。

## 4. 確認

ブラウザで:

```text
/api/backup-stamps?device=16文字以上の任意のID
```

を開いて、`found:false` が返ればWorkerからD1へ接続できています。

## 注意

このZIPはD1の接続基盤を直すものです。既存フロントに存在する `/api/stamps` `/api/me` `/api/journeys` などの別APIは、このZIPには元々実装が入っていないため、この版では新規実装していません。

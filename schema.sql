-- TOBESUKI 味印バックアップ用テーブル
-- 端末ごとのID(device_id)をキーに、味印(店舗IDの配列)をJSON文字列として保存する
CREATE TABLE IF NOT EXISTS stamp_backups (
  device_id TEXT PRIMARY KEY,
  store_ids TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

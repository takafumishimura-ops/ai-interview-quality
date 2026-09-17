-- Googleドライブ自動取り込み機能: 取り込み済みファイルの重複防止用カラム
alter table interviews add column if not exists drive_file_id text unique;

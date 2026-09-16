/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 画面遷移(クリックでのページ移動)時にNext.jsがページ内容を一時的に
  // キャッシュしてしまい、登録直後のデータが一覧に反映されないことがあるため、
  // このアプリでは常に最新のデータを取得するように無効化する。
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
};

module.exports = nextConfig;

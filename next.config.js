/** @type {import('next').NextConfig} */
const CORS_HEADERS = [
  { key: "Access-Control-Allow-Origin", value: "https://chatgpt.com" },
  { key: "Access-Control-Allow-Methods", value: "POST, GET, OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Content-Type" },
  { key: "Access-Control-Max-Age", value: "86400" },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: CORS_HEADERS,
      },
    ];
  },
};

module.exports = nextConfig;

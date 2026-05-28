/** @type {import('next').NextConfig} */
const CORS_HEADERS = [
  { key: "Access-Control-Allow-Origin", value: "https://chatgpt.com" },
  { key: "Access-Control-Allow-Methods", value: "POST, GET, OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Content-Type" },
  { key: "Access-Control-Max-Age", value: "86400" },
];

const nextConfig = {
  experimental: {
    instrumentationHook: true,
    // OTel SDKs pull in Node-only deps (gRPC etc.) that Next can't bundle.
    // Keep them external so they're required at runtime instead.
    serverComponentsExternalPackages: [
      "@opentelemetry/sdk-trace-node",
      "@opentelemetry/sdk-trace-base",
      "@opentelemetry/exporter-trace-otlp-http",
    ],
  },
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

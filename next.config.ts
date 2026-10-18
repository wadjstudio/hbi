import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir:
    process.env.HBI_E2E_MODE === "1"
      ? process.env.HBI_E2E_PORT
        ? `.next/e2e-${Number(process.env.HBI_E2E_PORT)}`
        : ".next/e2e"
      : ".next",
  turbopack: { root: process.cwd() },
  allowedDevOrigins: ["127.0.0.1"],
  reactStrictMode: true,
  poweredByHeader: false,
  typescript:
    process.env.HBI_E2E_MODE === "1" && process.env.HBI_E2E_PORT
      ? { tsconfigPath: "tsconfig.next-isolated.json" }
      : undefined,
  experimental: {
    typedEnv: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

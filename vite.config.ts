import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig, loadEnv } from "vite";
import vinext from "vinext";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "NEXT_PUBLIC_");
  const publicSupabase: Record<string, string> = {};
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ]) {
    const value = env[key];
    if (value) publicSupabase[key] = value;
  }
  return {
    plugins: [
      vinext(),
      cloudflare({
        config: (config) => ({ vars: { ...config.vars, ...publicSupabase } }),
        viteEnvironment: {
          name: "rsc",
          childEnvironments: ["ssr"],
        },
      }),
    ],
  };
});

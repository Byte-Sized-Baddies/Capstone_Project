import path from "path";
import dotenv from "dotenv";

/**
 * Force-load .env.local from the monorepo root
 * This ensures Supabase and other shared env vars are available
 * when running from inside apps/web
 */
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

/** @type {import('next').NextConfig} */
interface NextConfig {
  transpilePackages: string[];
  webpack: (config: WebpackConfig) => WebpackConfig;
}

interface WebpackConfig {
  resolve: {
    alias?: Record<string, string>;
  };
}

const nextConfig: NextConfig = {
  transpilePackages: [
    "@repo/ui",
    "@repo/hooks",
    "@repo/lib",
    "@repo/data",
    "@repo/auth",
  ],
  webpack: (config: WebpackConfig) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-native$": "react-native-web",
    };
    return config;
  },
};

export default nextConfig;

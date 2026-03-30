import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

/** @type {import('next').NextConfig} */
interface WebpackConfig {
  resolve: {
    alias?: Record<string, string>;
  };
}

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
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

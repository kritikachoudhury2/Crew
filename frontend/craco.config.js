// craco.config.js
const path = require("path");

// Only load dotenv in non-Vercel environments (Vercel injects env vars natively)
// dotenv is safe to call even if .env doesn't exist
if (process.env.VERCEL !== "1") {
  try {
    require("dotenv").config();
  } catch (e) {
    // dotenv not installed — env vars must be set in the shell/CI environment
  }
}

// Craco sets NODE_ENV=development for `start`, NODE_ENV=production for `build`
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  // Health check is an emergent-only feature — always disabled in production
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

// Conditionally load health check modules only if enabled AND the files exist
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  try {
    WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
    setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
    healthPluginInstance = new WebpackHealthPlugin();
  } catch (e) {
    console.warn("[health-check] Plugin files not found — health check disabled.");
    config.enableHealthCheck = false;
  }
}

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    configure: (webpackConfig) => {
      // Reduce watched directories in dev to improve performance
      webpackConfig.watchOptions = {
        ...webpackConfig.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/build/**",
          "**/dist/**",
          "**/coverage/**",
          "**/public/**",
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }

      return webpackConfig;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  // Add health check endpoints if enabled
  if (
    config.enableHealthCheck &&
    setupHealthEndpoints &&
    healthPluginInstance
  ) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }
      setupHealthEndpoints(devServer, healthPluginInstance);
      return middlewares;
    };
  }

  return devServerConfig;
};

// NOTE: @emergentbase/visual-edits has been intentionally removed.
// It was a private package hosted at assets.emergent.sh which is inaccessible
// on Vercel and any CI/CD environment outside Emergent's own servers.
// Keeping it caused `yarn install` to fail with exit code 1 on every deployment.

module.exports = webpackConfig;

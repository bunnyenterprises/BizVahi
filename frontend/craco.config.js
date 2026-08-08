// craco.config.js — Fintr production build config
const path = require("path");

module.exports = {
  // Disable the ESLint webpack plugin entirely.
  // It is not installed in CI, and lint warnings must never block a build.
  eslint: {
    enable: false,
  },

  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    configure: (webpackConfig) => {
      // Strip ESLintWebpackPlugin if CRA injected it anyway
      webpackConfig.plugins = (webpackConfig.plugins || []).filter(
        (plugin) => plugin && plugin.constructor && plugin.constructor.name !== "ESLintWebpackPlugin"
      );

      webpackConfig.watchOptions = {
        ...webpackConfig.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/build/**",
          "**/dist/**",
          "**/coverage/**",
        ],
      };

      return webpackConfig;
    },
  },
};

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig(() => {
  const disableHmr = process.env.VITE_DISABLE_HMR === "true";
  const hmrHost = process.env.VITE_HMR_HOST;

  return {
    plugins: [
      react(),
      svgr({
        svgrOptions: {
          icon: true,
          // This will transform your SVG to a React component
          exportType: "named",
          namedExport: "ReactComponent",
        },
      }),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0', // Permite acceso desde la red local
      port: 5173,
      hmr: disableHmr ? false : (hmrHost ? { host: hmrHost } : undefined),
    },
  };
});

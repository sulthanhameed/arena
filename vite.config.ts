import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // Vite answers 403 to any Host it does not recognise, which is every
  // cloud preview URL. Needed for the sandbox preview; harmless on Vercel,
  // which serves the built `dist/` and never runs this server.
  server: {
    host: true,
    allowedHosts: [".e2b.app", "localhost"],
  },
  preview: {
    host: true,
    allowedHosts: [".e2b.app", "localhost"],
  },
});

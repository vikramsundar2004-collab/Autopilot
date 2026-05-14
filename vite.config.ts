import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const toNormalizedPath = (id: string) => id.replace(/\\/g, "/");

const chunkBySubstring = (id: string, entries: Array<[string, string]>) => {
  for (const [needle, chunkName] of entries) {
    if (id.includes(needle)) {
      return chunkName;
    }
  }

  return undefined;
};

const getRendererChunkName = (id: string) => {
  const normalizedId = toNormalizedPath(id);

  if (normalizedId.includes("/src/renderer/components/")) {
    return "renderer-components";
  }

  return chunkBySubstring(normalizedId, [
    ["/src/renderer/autopilotApi", "renderer-api"],
    ["/src/renderer/calendarUtils", "renderer-calendar"],
    ["/src/renderer/codingDiff", "renderer-coding"],
    ["/src/renderer/history", "renderer-browser"],
    ["/src/renderer/productivity", "renderer-productivity"],
    ["/src/renderer/theme", "renderer-theme"]
  ]);
};

const getSharedChunkName = (id: string) => {
  const normalizedId = toNormalizedPath(id);

  if (!normalizedId.includes("/src/shared/")) {
    return undefined;
  }

  return chunkBySubstring(normalizedId, [
    ["/src/shared/artifact", "shared-artifacts"],
    ["/src/shared/workGraph", "shared-work"],
    ["/src/shared/workItems", "shared-work"],
    ["/src/shared/todaysCall", "shared-work"],
    ["/src/shared/proactiveWork", "shared-work"],
    ["/src/shared/coding", "shared-coding"],
    ["/src/shared/agent", "shared-agent"],
    ["/src/shared/automation", "shared-automation"],
    ["/src/shared/email", "shared-productivity"],
    ["/src/shared/productivity", "shared-productivity"],
    ["/src/shared/highImpactActions", "shared-payments"],
    ["/src/shared/account", "shared-account"],
    ["/src/shared/backendConfig", "shared-account"],
    ["/src/shared/browserModel", "shared-browser"],
    ["/src/shared/bookmark", "shared-browser"],
    ["/src/shared/workspaces", "shared-workspaces"],
    ["/src/shared/outputQuality", "shared-quality"],
    ["/src/shared/permissionPolicy", "shared-security"],
    ["/src/shared/onboarding", "shared-onboarding"]
  ]) ?? "shared-core";
};

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist/renderer",
    emptyOutDir: true,
    chunkSizeWarningLimit: 3200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("monaco-editor") || id.includes("@monaco-editor")) {
            return "monaco-editor";
          }

          if (id.includes("lucide-react")) {
            return "icons-vendor";
          }

          if (id.includes("jszip")) {
            return "zip-vendor";
          }

          if (id.includes("react") || id.includes("scheduler")) {
            return "react-vendor";
          }

          if (!id.includes("node_modules")) {
            return getRendererChunkName(id) ?? getSharedChunkName(id);
          }

          return "vendor";
        }
      }
    }
  }
});

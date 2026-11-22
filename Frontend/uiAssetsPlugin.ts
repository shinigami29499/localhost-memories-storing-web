import type { Plugin } from "vite";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export function uiAssetsPlugin(): Plugin {
  return {
    name: "shinigacim-ui-assets",
    apply: "build",
    writeBundle(options, bundle) {
      if (!options.dir) return;
      const outDir = options.dir;
      const assets = Object.keys(bundle).filter((file) => file.startsWith("assets/") && existsSync(resolve(outDir, file))).sort();
      const emitted = new Set(assets);
      const routes: Record<string, string[]> = {};

      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk" || !emitted.has(chunk.fileName)) continue;
        const sources = Object.keys(chunk.modules).filter((id) => this.getModuleInfo(id)?.dynamicImporters.length);
        if (!sources.length) continue;

        const files = new Set<string>();
        const visit = (file: string) => {
          if (files.has(file) || !emitted.has(file)) return;
          files.add(file);
          const dependency = bundle[file];
          if (dependency?.type !== "chunk") return;
          dependency.imports.forEach(visit);
          dependency.viteMetadata?.importedCss.forEach(visit);
          dependency.viteMetadata?.importedAssets.forEach(visit);
        };
        visit(chunk.fileName);
        for (const id of sources) {
          const source = id.replaceAll("\\", "/");
          const route = source.match(/\/apps\/(?:mobile|web)\/src\/(?:.*\/)?([^/]+\.tsx)$/)?.[1];
          if (route) routes[route] = [...files].map((file) => `/${file}`);
        }
      }

      writeFileSync(resolve(outDir, "ui-assets.json"), JSON.stringify({ assets: assets.map((file) => `/${file}`), routes }));
    },
  };
}

// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Public shells are prerendered. The Railway server authorizes protected
    // pages and serves real account data through the API.
    prerender: { enabled: true, autoStaticPathsDiscovery: true },
    pages: [
      ...[
        "plomeria",
        "electricidad",
        "cerrajeria",
        "albanileria",
        "pintura",
        "jardineria",
        "limpieza",
        "gas",
      ].map((slug) => ({ path: `/categorias/${slug}` })),
      ...["ver", "pro-1", "pro-2", "pro-3", "pro-4", "pro-5", "pro-6", "pro-7", "pro-8"].map(
        (id) => ({ path: `/profesionales/${id}` }),
      ),
      ...["nueva", "SOL-1042", "SOL-1039", "SOL-1031", "SOL-1028"].map((id) => ({
        path: `/solicitudes/${id}`,
      })),
    ],
  },
});

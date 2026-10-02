// MapLibre 6 carga su web worker como módulo aparte (maplibre-gl-worker.mjs,
// que importa ./maplibre-gl-shared.mjs). Turbopack no emite esos archivos, así
// que los servimos desde public/ y el mapa usa setWorkerUrl().
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const distDir = dirname(require.resolve("maplibre-gl/package.json")) + "/dist";
const outDir = join(process.cwd(), "public", "maplibre");

mkdirSync(outDir, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(distDir, file), join(outDir, file));
}
console.log("maplibre worker copiado a public/maplibre/");

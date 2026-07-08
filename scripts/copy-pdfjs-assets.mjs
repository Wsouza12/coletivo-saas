import { cpSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "node_modules/pdfjs-dist");
const dest = join(root, "public/pdfjs");

mkdirSync(join(dest, "wasm"), { recursive: true });
cpSync(join(src, "build/pdf.worker.min.mjs"), join(dest, "pdf.worker.min.js"));
cpSync(join(src, "wasm"), join(dest, "wasm"), { recursive: true });

/**
 * Build a single-file index.html for GitHub Pages (no external CSS/JS dependency).
 * Usage: node build.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, "index.source.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "styles.css"), "utf8");
const js = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");

let html = src;
html = html.replace(
  /<!-- BUILD:STYLE -->\s*<link rel="stylesheet" href="\.\/styles\.css" \/>/,
  `<style>\n${css}\n  </style>`
);
html = html.replace(
  /<!-- BUILD:SCRIPT -->\s*<script src="\.\/app\.js"><\/script>/,
  `<script>\n${js}\n  </script>`
);

fs.writeFileSync(path.join(__dirname, "index.html"), html, "utf8");
console.log("Built index.html (" + html.length + " chars)");

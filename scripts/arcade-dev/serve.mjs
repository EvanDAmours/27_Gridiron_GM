// A tiny static server for playtesting the arcade from source: node scripts/arcade-dev/serve.mjs [port]
import { createServer } from "node:http"; import { readFile } from "node:fs/promises"; import { join, extname } from "node:path";
const root = process.cwd(), port = +process.argv[2] || 8787;
const types = { ".html": "text/html", ".js": "text/javascript", ".jsx": "text/javascript", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".css": "text/css", ".woff2": "font/woff2" };
createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/") p = "/scripts/arcade-dev/index.html";
  if (p.startsWith("/sprites/") || p.startsWith("/logos/")) p = "/public" + p;
  try { const body = await readFile(join(root, p)); res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream", "cache-control": "no-store" }); res.end(body); }
  catch { res.writeHead(404); res.end("not found " + p); }
}).listen(port, () => console.log(`arcade dev: http://localhost:${port}/`));

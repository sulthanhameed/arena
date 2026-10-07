#!/usr/bin/env node
/* Serves the built site over plain HTTP.
 *
 * The Vite dev server kept reporting healthy while the sandbox
 * preview stayed blank, so this exists to take Vite out of the
 * picture entirely: no HMR websocket to fail, no host allowlist to
 * reject the preview origin, no module graph. Just files.
 *
 * Byte ranges are implemented because <video> asks for them, and a
 * server that answers every request with 200 and the whole file
 * will stall playback in some browsers.
 *
 *   node tools/serve-dist.cjs [port] [dir]
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.argv[2] || 5173);
const ROOT = path.resolve(process.argv[3] || path.join(__dirname, "..", "dist"));

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const send = (res, code, headers, body) => {
  res.writeHead(code, headers);
  if (body) res.end(body);
  else res.end();
};

http
  .createServer((req, res) => {
    let rel;
    try {
      rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    } catch {
      return send(res, 400, { "content-type": "text/plain" }, "bad request");
    }

    let file = path.join(ROOT, rel);
    /* never serve outside the root */
    if (!file.startsWith(ROOT)) file = ROOT;
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const index = path.join(file, "index.html");
      file = fs.existsSync(index) ? index : path.join(ROOT, "index.html");
    }
    if (!fs.existsSync(file)) {
      return send(res, 404, { "content-type": "text/plain" }, "not found");
    }

    const stat = fs.statSync(file);
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    const base = {
      "content-type": type,
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "x-frame-options": "ALLOWALL",
    };

    const range = req.headers.range;
    if (range && /^bytes=\d*-\d*$/.test(range)) {
      const [s, e] = range.replace("bytes=", "").split("-");
      const start = s === "" ? stat.size - Number(e) : Number(s);
      const end = s === "" || e === "" ? stat.size - 1 : Number(e);
      if (start >= stat.size || end >= stat.size || start > end) {
        return send(res, 416, { ...base, "content-range": `bytes */${stat.size}` });
      }
      res.writeHead(206, {
        ...base,
        "accept-ranges": "bytes",
        "content-range": `bytes ${start}-${end}/${stat.size}`,
        "content-length": end - start + 1,
      });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }

    res.writeHead(200, { ...base, "accept-ranges": "bytes", "content-length": stat.size });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`serving ${ROOT} on http://0.0.0.0:${PORT}`);
  });

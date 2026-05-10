const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const { extname, join, normalize } = require("node:path");
const { spawn } = require("node:child_process");

const root = join(process.cwd(), "dist");
const port = Number(process.env.PORT || 5173);
const shouldOpen = process.argv.includes("--open");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function openBrowser(url) {
  const child = spawn("cmd.exe", ["/c", "start", "", url], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.on("error", () => {
    console.log(`浏览器自动打开失败，请手动访问：${url}`);
  });
  child.unref();
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = normalize(join(root, pathname));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, { "Content-Type": mime[extname(filePath)] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`题库训练台已启动：${url}`);
  console.log("关闭这个终端窗口即可停止服务。");
  if (shouldOpen) openBrowser(url);
});

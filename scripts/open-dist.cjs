const { spawn } = require("node:child_process");
const { join } = require("node:path");

const file = join(process.cwd(), "dist", "index.html");
const child = spawn("cmd.exe", ["/c", "start", "", file], {
  detached: true,
  stdio: "ignore",
  windowsHide: true,
});

child.on("error", () => {
  console.log(`请手动打开：${file}`);
});

child.unref();

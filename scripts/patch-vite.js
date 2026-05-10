const { readdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const chunksDir = join(process.cwd(), "node_modules", "vite", "dist", "node", "chunks");
const marker = "codex-disable-net-use";
let patched = false;

for (const file of readdirSync(chunksDir)) {
  if (!file.endsWith(".js")) continue;
  const path = join(chunksDir, file);
  const source = readFileSync(path, "utf8");
  if (!source.includes('exec("net use"') && !source.includes("exec('net use'")) continue;
  if (source.includes(marker)) {
    patched = true;
    continue;
  }

  const next = source.replace(
    /(\n\s*)exec\((["'])net use\2/,
    `$1// ${marker}: local workspace builds do not need Windows network-drive probing.\n$1safeRealpathSync = fs.realpathSync.native;\n$1return;\n$1exec($2net use$2`,
  );

  if (next === source) {
    throw new Error(`Unable to patch ${path}`);
  }

  writeFileSync(path, next);
  patched = true;
}

if (!patched) {
  throw new Error("Vite net-use probe was not found; reinstall dependencies or update the patch script.");
}

console.log("Vite Windows net-use probe patched");

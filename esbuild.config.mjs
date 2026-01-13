import esbuild from "esbuild";
import fs from "fs";
import path from "path";

const outdir = "dist";

// ===== JSビルド =====
await esbuild.build({
  entryPoints: ["src/main.ts", "src/preload.ts", "src/meet-preload.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  outdir,
});

// ===== assetsコピー =====
const srcAssets = path.join("src", "assets");
const distAssets = path.join(outdir, "assets");

fs.mkdirSync(distAssets, { recursive: true });

for (const file of fs.readdirSync(srcAssets)) {
  fs.copyFileSync(path.join(srcAssets, file), path.join(distAssets, file));
}

console.log("Assets copied to dist/assets");

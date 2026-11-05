import { build } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";
await mkdir("dist/assets", { recursive: true });
await build({
  entryPoints: ["src/cloud.js"],
  bundle: true,
  minify: true,
  format: "esm",
  outfile: "dist/cloud.js",
  platform: "browser",
  target: "es2022",
  define: { "process.env.NODE_ENV": '"production"' },
});
for (const [family, suffix] of [
  ["barlow-condensed", "800-italic"],
  ["barlow-condensed", "700-normal"],
  ["inter", "400-normal"],
  ["inter", "600-normal"],
]) {
  const file = family + "-latin-" + suffix + ".woff2";
  await copyFile(
    "node_modules/@fontsource/" + family + "/files/" + file,
    "dist/assets/" + file,
  );
}

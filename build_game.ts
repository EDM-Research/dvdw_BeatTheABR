await Bun.build({
  entrypoints: ["./game/index.ts"],
  outdir: "./dist",
  minify: false,
  sourcemap: "inline",
  target: "browser",
  plugins: [ /* ... */]
})
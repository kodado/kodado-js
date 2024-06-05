import dts from "bun-plugin-dts";
import path from "path";

const myPlugin = {
  name: "node buffer in the frontend",
  setup(build) {
    build.onResolve({ filter: /^buffer$/ }, (args) => {
      const path_to_buffer_lib = path.resolve(
        "./",
        "node_modules/buffer/index.js"
      );
      if (path_to_buffer_lib)
        return {
          path: path_to_buffer_lib,
        };
    });
  },
};

const output = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "browser",
  minify: true,
  plugins: [dts(), myPlugin],
  define: {
    global: "window",
  },
});

if (!output.success) {
  for (const log of output.logs) {
    console.error(log);
  }
}

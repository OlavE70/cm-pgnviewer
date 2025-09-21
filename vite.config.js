import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      // Lokale Pakete auf die konkreten Quellen zeigen
      "cm-pgn": path.resolve(__dirname, "../cm-pgn/src/Pgn.js"),
      "cm-chessboard": path.resolve(__dirname, "../cm-chessboard/src/Chessboard.js"),
      "chess.mjs/src/Chess.js": path.resolve(__dirname, "../chess.mjs/src/Chess.js"),

      // Assets für cm-chessboard
      // "cm-chessboard-assets": path.resolve(__dirname, "../cm-chessboard/assets"),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/cm-pgnviewer.js"),
      name: "cmPgnViewer",
      fileName: (format) => `cm-pgnviewer.${format}.js`,
    },
    rollupOptions: {
      // Diese Pakete bleiben extern, werden nicht gebündelt
      external: ["cm-chessboard", "cm-pgn", "chess.mjs"],
      output: {
        globals: {
          "cm-chessboard": "Chessboard",
          "cm-pgn": "cmPgn",
          "chess.mjs": "Chess",
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  publicDir: path.resolve(__dirname, "public"), // Optional für Demo-HTML & Assets
});

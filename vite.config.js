import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "cm-chessboard",
        replacement: path.resolve(__dirname, "../cm-chessboard/src/Chessboard.js"),
      },
      {
        find: "cm-chessboard/",
        replacement: path.resolve(__dirname, "../cm-chessboard/src/"),
      },
      {
        find: "cm-pgn",
        replacement: path.resolve(__dirname, "../cm-pgn/src/Pgn.js"),
      },
      {
        find: "cm-pgn/",
        replacement: path.resolve(__dirname, "../cm-pgn/src/"),
      },
      {
        find: "chess.mjs",
        replacement: path.resolve(__dirname, "../chess.mjs/src/Chess.js"),
      },
    ],
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/cm-pgnviewer.js"),
      name: "cmPgnViewer",
      fileName: (format) => `cm-pgnviewer.${format}.js`,
    },
    rollupOptions: {
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
  publicDir: path.resolve(__dirname, "public"),
});

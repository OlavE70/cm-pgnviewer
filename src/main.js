// Script des Viewers
import { PgnViewer } from "./cm-pgnviewer.js";

// Styles importieren (funktioniert über Vite direkt aus node_modules!)
import "cm-chessboard/assets/chessboard.css";
import "../styles.css";

// Viewer starten
const pgnviewer = new PgnViewer("board-container", "moves-container");
window.viewer = pgnviewer;
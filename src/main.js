// Script des Viewers
import { PgnViewer } from "./cm-pgnviewer.js";

// Viewer starten
const pgnviewer = new PgnViewer("board-container", "moves-container");
window.viewer = pgnviewer;
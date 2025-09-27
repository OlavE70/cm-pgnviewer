import { PgnViewer } from "./cm-pgnviewer.js";

export function initPgnViewers() {
  const pgnTags = document.querySelectorAll("pgn");
  let counter = 1;

  pgnTags.forEach(tag => {
    const pgnText = tag.textContent.trim();
    const viewerId = `pgnViewer${counter}`;

    // Container-IDs generieren
    const ids = {
      root: viewerId,
      board: `board${counter}`,
      controls: `controls${counter}`,
      moves: `moves${counter}`,
      startBtn: `startBtn${counter}`,
      prevBtn: `prevBtn${counter}`,
      nextBtn: `nextBtn${counter}`,
      endBtn: `endBtn${counter}`,
      flipBtn: `flipBtn${counter}`,
      autoBtn: `autoBtn${counter}`,
      showBtn: `showBtn${counter}`,
      pgnArea: `pgnArea${counter}`,
    };

    // Neues HTML für den Viewer
    const wrapper = document.createElement("div");
    wrapper.className = "pgn-viewer";
    wrapper.id = ids.root;
    wrapper.innerHTML = `
      <div id="${ids.board}" class="board"></div>

      <div id="${ids.controls}" class="controls">
        <button id="${ids.startBtn}">|&lt;</button>
        <button id="${ids.prevBtn}">&lt;</button>
        <button id="${ids.nextBtn}">&gt;</button>
        <button id="${ids.endBtn}">&gt;|</button>
        <button id="${ids.flipBtn}">Flip</button>
        <button id="${ids.autoBtn}">Auto</button>
        <button id="${ids.showBtn}">Show PGN</button>
      </div>

      <div id="${ids.pgnArea}" class="pgn-area" style="display:none;">
        <pre>${pgnText}</pre>
      </div>

      <div id="${ids.moves}" class="moves"></div>
    `;

    // Ersetze das ursprüngliche <pgn>-Element
    tag.replaceWith(wrapper);

    // Neuen Viewer initialisieren
    const viewer = new PgnViewer(ids.board, ids.moves, ids, pgnText);

    counter++;
  });
}

// Automatischer Aufruf bei DOMContentLoaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPgnViewers);
} else {
  initPgnViewers();
}

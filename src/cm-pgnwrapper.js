// cm-pgnwrapper.js
import { PgnViewer } from './cm-pgnviewer.js';

export function initPgnViewers() {
  const viewers = [];

  // ======== PGN ========
  const pgnElements = Array.from(document.querySelectorAll('pgn'));
  pgnElements.forEach((pgnElement, i) => {
    const viewer = createViewerFromElement(pgnElement, i, "pgn");
    viewers.push(viewer);
  });

  // ======== BOARD (FEN + Prüfung) ========
  const boardElements = Array.from(document.querySelectorAll('board'));
  boardElements.forEach((boardElement, i) => {
    const viewer = createViewerFromElement(boardElement, i, "board");
    viewers.push(viewer);
  });

  // ======== FEN (Dummy) ========
  const fenElements = Array.from(document.querySelectorAll('fen'));
  fenElements.forEach((fenElement, i) => {
    const viewer = createViewerFromElement(fenElement, i, "fen");
    viewers.push(viewer);
  });

  // Nach dem Laden: Moves rendern
  window.addEventListener('load', () => {
    viewers.forEach(({ instance }) => {
      if (typeof instance.renderMoves === 'function') instance.renderMoves();
    });
  });
}

// ======== Hilfsfunktion ========
function createViewerFromElement(el, index, type) {
  const baseId = `${type}Viewer${index}`;
  const content = (el.innerHTML || '');

  // für PGN an Viewer
  let  contentPgn = content
    .replaceAll('<br/>', ' ')
    .replaceAll('<br>', ' ')
    .replaceAll('1:0', '1-0')
    .replaceAll('0:1', '0-1')
    .replaceAll('1/2:1/2', '1/2-1/2')
    .replaceAll('0-0-0', 'O-O-O')
    .replaceAll('0-0', 'O-O')
    .trim(); 

  // für pgnArea möglichst Original, wie in <pgn> ... </pgn>, jedoch bereinigt um überflüssige White-Spaces
  // und mit den bisherigen Bereinigungen
  let contentPgnRaw = contentPgn
    .replace(/\n\s+/g, '\n')
    .trim();

  const viewerContainer = document.createElement('div');
  viewerContainer.classList.add('pgnViewerContainer');
  viewerContainer.id = baseId;
  viewerContainer.style.visibility = 'hidden';

  // Header
  const header = document.createElement('div');
  header.classList.add('viewer-header');
  header.id = `${baseId}Header`;
  viewerContainer.appendChild(header);

  // Hauptinhalt
  const mainContent = document.createElement('div');
  mainContent.classList.add('mainContent');
  viewerContainer.appendChild(mainContent);

  // === Linke Spalte: Board + Buttons ===
  const boardColumn = document.createElement('div');
  boardColumn.classList.add('boardColumn');
  mainContent.appendChild(boardColumn);

  const boardContainer = document.createElement('div');
  boardContainer.classList.add('outerBoard', 'board-container');
  boardContainer.id = `${baseId}Board`;
  boardColumn.appendChild(boardContainer);

  // Buttons
  const buttonsContainer = document.createElement('div');
  buttonsContainer.classList.add('buttons');
  buttonsContainer.id = `${baseId}Buttons`;

  // Button-Definitionen je nach Modus
  const btnDefs = (type === "pgn")
    ? [
        { id: `${baseId}Flipper`, icon: 'fa-sync-alt', title: 'Flip Board' },
        { id: `${baseId}Start`, icon: 'fa-step-backward', title: 'Start' },
        { id: `${baseId}Prev`, icon: 'fa-chevron-left', title: 'Previous' },
        { id: `${baseId}Auto`, icon: 'fa-play', title: 'Auto Play' },
        { id: `${baseId}Next`, icon: 'fa-chevron-right', title: 'Next' },
        { id: `${baseId}End`, icon: 'fa-step-forward', title: 'End' },
        { id: `${baseId}Show`, icon: 'fa-file-alt', title: 'Show PGN' }
      ]
    : [
        { id: `${baseId}Flipper`, icon: 'fa-sync-alt', title: 'Flip Board' },
        { id: `${baseId}Undo`, icon: 'fa-undo', title: 'Undo Move' },
        { id: `${baseId}Reset`, icon: 'fa-trash', title: 'Reset Position' }
      ];

  btnDefs.forEach(b => {
    const btn = document.createElement('button');
    btn.className = `button`;
    btn.id = b.id;
    btn.setAttribute('aria-label', b.title);
    btn.type = 'button';

    const icon = document.createElement('i');
    icon.className = `fas ${b.icon}`;
    icon.setAttribute('aria-hidden', 'true');
    btn.appendChild(icon);

    buttonsContainer.appendChild(btn);
  });

  boardColumn.appendChild(buttonsContainer);

  // === Rechte Spalte: Moves ===
  const movesColumn = document.createElement('div');
  movesColumn.classList.add('movesColumn');
  mainContent.appendChild(movesColumn);

  const movesContainer = document.createElement('div');
  movesContainer.classList.add('moves');
  movesContainer.id = `${baseId}Moves`;
  movesColumn.appendChild(movesContainer);

  // === PGN-Textbereich (nur für PGN) ===
  let pgnArea = null;
  if (type === "pgn") {
    pgnArea = document.createElement('div');
    pgnArea.classList.add('pgnText');
    pgnArea.id = `${baseId}PGN`;
    pgnArea.textContent = contentPgnRaw;
    pgnArea.style.display = 'none';
  }

  // Ersetzen und anhängen
  el.replaceWith(viewerContainer);
  if (pgnArea) viewerContainer.after(pgnArea);

  // IDs für den Viewer
  const ids = {
    board: `${baseId}Board`,
    moves: `${baseId}Moves`,
    header: `${baseId}Header`,
    flipBtn: `${baseId}Flipper`,
    startBtn: `${baseId}Start`,
    prevBtn: `${baseId}Prev`,
    autoBtn: `${baseId}Auto`,
    nextBtn: `${baseId}Next`,
    endBtn: `${baseId}End`,
    showBtn: `${baseId}Show`,
    undoBtn: `${baseId}Undo`,
    resetBtn: `${baseId}Reset`,
    pgnArea: `${baseId}PGN`
  };

  // Viewer-Instanz je nach Typ
  let viewerInstance;
  if (type === "pgn") {
    viewerInstance = new PgnViewer(ids, contentPgn);
  } 
  else if (type === "board") {
    const meta = { dummy: false }; 
    viewerInstance = new PgnViewer(ids, { type: "board", fen: content, meta });
  }
  else {
    const meta = { dummy: true };
    viewerInstance = new PgnViewer(ids, { type: "fen", fen: content, meta });
  }

  viewerContainer.style.visibility = 'visible';
  return { container: viewerContainer, instance: viewerInstance };
}

if (typeof window !== 'undefined') {
  window.initPgnViewers = initPgnViewers;
}

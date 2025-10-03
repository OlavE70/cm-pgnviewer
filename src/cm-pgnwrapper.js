import { PgnViewer } from './cm-pgnviewer.js';

export function initPgnViewers() {
  const pgnElements = Array.from(document.querySelectorAll('pgn'));
  const viewers = [];

  pgnElements.forEach((pgnElement, i) => {
    let pgnTextRaw = (pgnElement.innerHTML || ''); 

    // für Übergabe an Viewer:
    let  pgnText = pgnTextRaw
      .replaceAll('<br/>', ' ')
      .replaceAll('<br>', ' ')
      .replaceAll('1:0', '1-0')
      .replaceAll('0:1', '0-1')
      .replaceAll('1/2:1/2', '1/2-1/2')
      .replaceAll('0-0-0', 'O-O-O')
      .replaceAll('0-0', 'O-O')
      .trim(); 
  
    // für pgnArea möglichst Original, wie in <pgn> ... </pgn>, jedoch bereinigt um überflüssige White-Spaces
    // und mit den bisherigen Bereinigungen aus pgnText:
    pgnTextRaw =  pgnText
      .replace(/\n\s+/g, '\n')
      .trim();

    const baseId = `pgnBoard${i}`;

    // === Hauptcontainer ===
    const viewerContainer = document.createElement('div');
    viewerContainer.classList.add('pgnViewerContainer');
    viewerContainer.id = baseId;
    viewerContainer.style.visibility = 'hidden';

    // optionaler Header (für Meta-Daten)
    const header = document.createElement('div');
    header.classList.add('viewer-header');
    header.textContent = 'Mein Header';
    viewerContainer.appendChild(header);

    // Main-Container für Board / Buttons und Moves
    const mainContent = document.createElement('div');
    mainContent.classList.add('mainContent');
    viewerContainer.appendChild(mainContent);

    // === Linke Spalte: Board + Buttons ===
    const boardColumn = document.createElement('div');
    boardColumn.classList.add('boardColumn');   // flex-column
    mainContent.appendChild(boardColumn);

    const boardContainer = document.createElement('div');
    boardContainer.classList.add('outerBoard', 'board-container');
    boardContainer.id = `${baseId}Board`;
    boardColumn.appendChild(boardContainer);

    // Buttons unter Board
    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttons');
    buttonsContainer.id = `${baseId}Buttons`;

    /* 
    const btnDefs = [
      { id: `${baseId}Flipper`, cls: 'flipper', icon: 'fa-sync-alt',      title: 'Flip' },
      { id: `${baseId}Start`,   cls: 'first',   icon: 'fa-step-backward', title: 'Start' },
      { id: `${baseId}Prev`,    cls: 'prev',    icon: 'fa-chevron-left',  title: 'Prev.' },
      { id: `${baseId}Auto`,    cls: 'play',    icon: 'fa-play',          title: 'Auto' },
      { id: `${baseId}Next`,    cls: 'next',    icon: 'fa-chevron-right', title: 'Next' },
      { id: `${baseId}End`,     cls: 'last',    icon: 'fa-step-forward',  title: 'End' },
      { id: `${baseId}Show`,    cls: 'show-pgn', icon: 'fa-file-alt',     title: 'PGN' } 
    ];

    btnDefs.forEach(b => {
      const span = document.createElement('span');
      span.className = `button ${b.cls}`;
      span.id = b.id;
      span.setAttribute('role', 'button');
      span.title = b.cls;

      const icon = document.createElement('i');
      icon.className = `fas ${b.icon}`;
      span.appendChild(icon);

      buttonsContainer.appendChild(span);
    });
    */
   
    const btnDefs = [
      { id: `${baseId}Flipper`, cls: 'flipper', icon: 'fa-sync-alt', title: 'Flip Board' },
      { id: `${baseId}Start`,   cls: 'first',   icon: 'fa-step-backward', title: 'Start' },
      { id: `${baseId}Prev`,    cls: 'prev',    icon: 'fa-chevron-left',  title: 'Previous Move' },
      { id: `${baseId}Auto`,    cls: 'play',    icon: 'fa-play',          title: 'Auto Play' },
      { id: `${baseId}Next`,    cls: 'next',    icon: 'fa-chevron-right', title: 'Next Move' },
      { id: `${baseId}End`,     cls: 'last',    icon: 'fa-step-forward',  title: 'Go to End' },
      { id: `${baseId}Show`,    cls: 'show-pgn', icon: 'fa-file-alt',    title: 'Show PGN' }
    ];

    btnDefs.forEach(b => {
      // Erzeuge semantisches Button-Element
      const btn = document.createElement('button');
      btn.className = `button ${b.cls}`;
      btn.id = b.id;
      btn.setAttribute('aria-label', b.title);
      btn.type = 'button';

      // Icon hinzufügen (Screenreader ignoriert Icon)
      const icon = document.createElement('i');
      icon.className = `fas ${b.icon}`;
      icon.setAttribute('aria-hidden', 'true');
      btn.appendChild(icon);

      // Button in den Container einfügen
      buttonsContainer.appendChild(btn);
    });

    boardColumn.appendChild(buttonsContainer);

    // === Rechte Spalte: Moves ===
    const movesColumn = document.createElement('div');
    movesColumn.classList.add('movesColumn'); // flex-column
    mainContent.appendChild(movesColumn);

    const movesContainer = document.createElement('div');
    movesContainer.classList.add('moves');
    movesContainer.id = `${baseId}Moves`;
    movesColumn.appendChild(movesContainer);

    // === PGN-Textbereich unterhalb beider Spalten ===
    const pgnArea = document.createElement('div');
    pgnArea.classList.add('pgnText');
    pgnArea.id = `${baseId}PGN`;
    pgnArea.textContent = pgnTextRaw;
    pgnArea.style.display  = 'none';

    // <pgn> ersetzen
    pgnElement.replaceWith(viewerContainer);
    // pgnArea anschließend setzen
    viewerContainer.after(pgnArea);

    // IDs für PgnViewer
    const ids = {
      flipBtn: `${baseId}Flipper`,
      startBtn: `${baseId}Start`,
      prevBtn: `${baseId}Prev`,
      autoBtn: `${baseId}Auto`,
      nextBtn: `${baseId}Next`,
      endBtn: `${baseId}End`,
      showBtn: `${baseId}Show`,
      pgnArea: `${baseId}PGN`
    };

    // PgnViewer erzeugen
    const viewerInstance = new PgnViewer(boardContainer.id, movesContainer.id, ids, pgnText);
    viewers.push({ container: viewerContainer, instance: viewerInstance });
    viewerContainer.style.visibility = 'visible';
  });

  window.addEventListener('load', () => {
    viewers.forEach(({ container, instance }) => {
      if (typeof instance.renderMoves === 'function') instance.renderMoves();
    });
  });
}

if (typeof window !== 'undefined') {
  window.initPgnViewers = initPgnViewers;
}

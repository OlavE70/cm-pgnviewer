// cm-pgnviewer.js
import { Pgn as cmPgn } from 'cm-pgn';
import { Chessboard, COLOR, FEN } from 'cm-chessboard';
// @ts-ignore
import { Chess } from 'chess.mjs/src/Chess.js';

// Zeiger auf aktives AutoPlay -> es soll nur jeweils ein Board laufen
let currentAutoPlayer = null;
export class PgnViewer {
    constructor(ids, data) {
        this.ids = ids;
        this.boardContainer = document.getElementById(this.ids.board);
        this.movesContainer = document.getElementById(this.ids.moves);
        this.headerElement = document.getElementById(this.ids.header);

        this.mode= "pgn";
        this.autoPlayInterval = null;
        this.autoPlaying = false;

        this.board = new Chessboard(this.boardContainer, {
            assetsUrl: "/cm-chessboard-assets/",
            responsive: true,
            style: {
                cssClass: "blue",
                showCoordinates: true,
                aspectRatio: 1,
                pieces: {
                    file: "pieces/standard.svg",
                    tileSize: 40
                },
                animationDuration: 300
            },
            position: FEN.start
        });

        this.chess = new Chess();

        this.initBoardPGN();

        if (typeof data === "string") {
            this.mode = "pgn";
            this.loadPgn(data);
        } else if (data?.type === "board") {
            this.mode = "board";
            const fen = this.completeFen(data.fen);
            const miniPgn = `[SetUp "1"]
                [FEN "${fen}"]`;
            this.loadBoard(miniPgn, data.meta);
        } else if (data?.type === "fen") {
            this.mode = "fen";
            this.loadFen(data.fen, data.meta);
        }

        this.registerControls();
    }

    /* Zeigt Board an, wenn kein PGN vorliegt. */
    initBoardPGN() {
        this.startFen = FEN.start;
        this.startPly = 0;
        this.pgnObj = new cmPgn("");
        this.root = {
            fen: this.startFen,
            ply: this.startPly,
            previous: null,
            next: null,
            variation: this.pgnObj.history?.moves || []
        };
        this.current = null;
        this.board.setPosition(this.startFen, false);
    }

    registerControls() {
        const get = id => document.getElementById(id);

        // --- Scoped keyboard handling: nur der fokussierte Viewer reagiert ---
        // Versuche, den umgebenden Viewer-Container zu finden (Wrapper setzt class 'pgnViewerContainer')
        const viewerContainer =
        this.boardContainer.closest?.('.pgnViewerContainer') ||
        (this.boardContainer.parentElement || null);

        if (viewerContainer) {
            // mach den Container fokussierbar
            if (!viewerContainer.hasAttribute('tabindex')) viewerContainer.setAttribute('tabindex', '0');

            // Klick in den Container soll Fokus setzen (damit Tastaturbefehle sichtbar wirken)
            viewerContainer.addEventListener('click', () => {
                try { viewerContainer.focus(); } catch (e) { /* ignore */ }
            });

            // Verhindere doppelte Bindung falls registerControls mehrmals aufgerufen wird
            if (!this._keyboardBound) {
                viewerContainer.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight') { this.nextMove(); e.preventDefault(); }
                else if (e.key === 'ArrowLeft') { this.prevMove(); e.preventDefault(); }
                else if (e.key === 'ArrowDown') { this.switchVariant(1); e.preventDefault(); }
                else if (e.key === 'ArrowUp') { this.switchVariant(-1); e.preventDefault(); }
                else if (e.key === ' ') {     // Space
                    e.preventDefault(); 
                    if (this.autoPlaying) this.stopAutoPlay();
                    this.nextMove(); 
                    }
                else if (e.key === 'Enter') {
                    const activeMove = this.movesContainer.querySelector('.move:focus');
                    if (activeMove) {
                        activeMove.click();
                        e.preventDefault();
                    }
                }
                });
                this._keyboardBound = true;
            }
        }

        get(this.ids.flipBtn)?.addEventListener('click', () => {
            this.board.setOrientation(this.board.getOrientation() === 'w' ? 'b' : 'w');
        });

        if (this.mode === "pgn") {

            get(this.ids.nextBtn)?.addEventListener('click', () => this.nextMove());
            get(this.ids.prevBtn)?.addEventListener('click', () => this.prevMove());
            get(this.ids.startBtn)?.addEventListener('click', () => this.goToStart());
            get(this.ids.endBtn)?.addEventListener('click', () => this.goToEnd());

            get(this.ids.autoBtn)?.addEventListener('click', () => {
                this.startAutoPlay();
            });

            get(this.ids.stopBtn)?.addEventListener('click', () => {
                this.stopAutoPlay();
            });

            get(this.ids.showBtn)?.addEventListener("click", () => {
                const area = get(this.ids.pgnArea);
                if (!area) return;
                const btn = get(this.ids.showBtn);
                if (area.style.display === "none") {
                    area.style.display = "block";
                } else {
                    area.style.display = "none";
                }
            });
        } 
        else {
            get(this.ids.undoBtn)?.addEventListener('click', () => {
                this.undoMove();
            });

            get(this.ids.resetBtn)?.addEventListener('click', () => {
                this.resetFen();
            });
        }
    }

    /* === Abschnitt für this.mode = "board" === */
    loadBoard(pgn, meta) {
        this.meta = meta;
        this.loadPgn(pgn);
        this.renderFenHeader(this.meta);
    }

    /* === Abschnitt speziell für PGN === */
    registerBoardInput() {
        this.board.enableMoveInput((event) => {
            if (event.type === "validateMoveInput") {
                const { squareFrom, squareTo } = event;

                this.chess.load(this.current?.fen || this.startFen);
                const move = this.chess.move({
                    from: squareFrom,
                    to: squareTo,
                    promotion: "q"
                });
                if (!move) return false;

                const san = move.san;
                const branchPoint = this.current || this.root;

                if (branchPoint.next && branchPoint.next.san === san) {
                    this.current = branchPoint.next;
                    this.updateBoardToNode(this.current);
                    this.renderMoves();
                    return true;
                }

                if (branchPoint.variations?.length) {
                    for (const variation of branchPoint.variations) {
                        if (variation.length > 0 && variation[0].san === san) {
                            this.current = variation[0];
                            this.updateBoardToNode(this.current);
                            this.renderMoves();
                            return true;
                        }
                    }
                }

                let prev = this.current || null;
                if (!prev && this.root?.next) prev = this.root;

                let newMove;
                try {
                    newMove = this.pgnObj.history.addMove(san, prev);
                } catch (err) {
                    console.error("addMove failed", err);
                    return false;
                }

                if (!this.root.next && this.pgnObj.history.moves.length > 0) {
                    this.root.next = this.pgnObj.history.moves[0];
                    this.root.variation = this.pgnObj.history.moves;
                }

                this.current = newMove;
                this.board.setPosition(this.chess.fen(), true);
                this.renderMoves();
                return true;
            }
            return true;
        });
    }

    loadPgn(pgnText) {
        try {
            this.pgnObj = new cmPgn(pgnText);
            this.startFen = this.pgnObj.history?.props?.setUpFen || FEN.start;
            this.startPly = this.pgnObj.history?.props?.startPly || 0;
            this.root.variation = this.pgnObj.history?.moves || [];
            this.root.next = this.pgnObj.history?.moves?.[0] || null;
            this.current = null;
            this.board.setPosition(this.startFen, false);
            if (this.mode === "pgn") {
                this.renderPgnHeader();
            }
        } catch (e) {
            console.error("PGN parse failed", e);
            this.initBoardPGN();
            if (this.headerElement) {
                this.headerElement.innerHTML = "";
            }
            this.pgnObj = null;
        }

        this.renderMoves();
        this.registerBoardInput();
    }

    renderPgnHeader() {
        if (!this.headerElement) return;

        const h = this.pgnObj?.header.tags;
        if (!h) {
            this.headerElement.innerHTML = "";
            return;
        }

        // Zeile 1: White - Black, nur anzeigen, wenn vorhanden
        const line1Parts = [];
        if (h.White) line1Parts.push(h.White);
        if (h.Black) line1Parts.push(h.Black);
        const line1 = line1Parts.join(' - ');

        // Zeile 2: Event · Site · Round · Date · ECO · Result, nur vorhandene Werte
        const line2Tags = [h.Event, h.Site, h.Round, h.Date, h.ECO, h.Result].filter(Boolean);
        const line2 = line2Tags.join(' · '); // Zentrierter Punkt als Trenner

        const html = `
            <div class="header-line1">${line1}</div>
            <div class="header-line2">${line2}</div>
        `;
        this.headerElement.innerHTML = html.trim();
    }
    /* === Ende des PGN-Abschnitts === */

    /* === Abschnitt speziell für FEN / Schachkomposition === */
    loadFen(fen, meta = {}) {
        this.meta = meta;

        // Board mit oder ohne Validitätsprüfung der Züge?
        this.dummyBoard = meta?.dummy || false;

        this.startFen = this.completeFen(fen);
        try {
            this.chess.load(this.startFen);
        } catch {
            console.warn("Invalid or partial FEN, using default setup fallback.");
            this.chess.reset();
        }

        this.board.setPosition(this.chess.fen(), false);
        this.moves = [];
        this.renderFenHeader(meta);
        this.renderMoves();
        this.registerFenInput();
    }

    completeFen(fen) {
        const parts = fen.trim().split(/\s+/);
        if (parts.length === 1) return `${parts[0]} w - - 0 1`;
        if (parts.length === 2) return `${parts.join(' ')} - - 0 1`;
        if (parts.length === 3) return `${parts.join(' ')} - 0 1`;
        if (parts.length === 4) return `${parts.join(' ')} 0 1`;
        if (parts.length === 5) return `${parts.join(' ')} 1`;
        return fen;
    }

    registerFenInput() {
        this.board.enableMoveInput(async (event) => {
            if (event.type !== "validateMoveInput") return true;

            const from = event.squareFrom;
            const to = event.squareTo;

            // Ply / Farbe
            const ply = this.current ? this.current.ply + 1 : 1;
            const color = ply % 2 === 1 ? 'w' : 'b';

            let fen, san, piece;

            if (!this.dummyBoard) {
                // Legal FEN → chess.js validiert
                const lastFen = this.current?.fen || this.startFen;
                this.chess.load(lastFen);
                const move = this.chess.move({ from, to, promotion: 'q' });
                if (!move) return false;
                fen = this.chess.fen();
                san = move.san;
                piece = move.piece;
            } else {
                // Dummy-Modus → nur visuelles Board
                piece = this.board.getPiece(from);
                if (!piece) return false;

                await this.board.movePiece(from, to, true);
                fen = this.board.getPosition();
                san = `${from}-${to}`;
            }

            // BranchPoint für Zugbaum
            const branchPoint = this.current || this.root;

            // Prüfen lineare Fortsetzung
            if (branchPoint.next && branchPoint.next.san === san) {
                this.current = branchPoint.next;
                this.updateBoardToNode(this.current);
                this.renderMoves();
                return true;
            }

            // Prüfen Varianten
            if (branchPoint.variations?.length) {
                for (const variation of branchPoint.variations) {
                    if (variation.length > 0 && variation[0].san === san) {
                        this.current = variation[0];
                        this.updateBoardToNode(this.current);
                        this.renderMoves();
                        return true;
                    }
                }
            }

            // Neuer Move → über History hinzufügen, auch Dummy
            let newMove;
            try {
                newMove = this.pgnObj.history.addMove(san, branchPoint);
                newMove.fen = fen;
                newMove.piece = piece;
                newMove.from = from;
                newMove.to = to;
                newMove.color = color;
            } catch (err) {
                console.error("addMove failed", err);
                return false;
            }

            // Root.next setzen, falls nötig
            if (!this.root.next && this.pgnObj.history.moves.length > 0) {
                this.root.next = this.pgnObj.history.moves[0];
                this.root.variation = this.pgnObj.history.moves;
            }

            this.current = newMove;
            this.updateBoardToNode(this.current);
            this.renderMoves();
            return true;
        });
    }

    renderFenHeader(meta = {}) {
        const { author, source, stipulation } = meta;
        this.headerElement.innerHTML = `
            <div class="header-line1">${author || ''}</div>
            <div class="header-line2">${source || ''}${stipulation ? ' · ' + stipulation : ''}</div>
        `;
    }
        /* === Ende des FEN-Abschnitts === */

    renderMoves() {
        this.movesContainer.innerHTML = '';

        const renderNode = (moves, container, isVariant = false) => {
            moves.forEach(move => {

                // --- Kommentar direkt zum Zug (commentMove) ---
                if (move.commentMove) {
                    const cm = document.createElement(isVariant ? 'span' : 'div');
                    cm.className = isVariant ? 'comment-inline' : 'comment';
                    cm.textContent = move.commentMove;
                    container.appendChild(cm);
                    container.appendChild(document.createTextNode(' '));
                }

                if (move.commentBefore) {
                    const cb = document.createElement(isVariant ? 'span' : 'div');
                    cb.className = isVariant ? 'comment-inline' : 'comment';
                    cb.textContent = move.commentBefore;
                    container.appendChild(cb);
                    container.appendChild(document.createTextNode(' '));
                }

                const zeroBased = Math.floor((move.ply - 1) / 2);
                const startMoveNumber = Math.floor(this.startPly / 2) + 1;
                const moveNumber = startMoveNumber + zeroBased;
                const moveSan = move.san || move.notation || '(?)';
                const isFirstInVariation = !!(move.variation && move.variation[0] === move);

                let prefix = '';
                if (move.color === 'w') prefix = `${moveNumber}. `;
                else if (isFirstInVariation || (move.previous?.commentAfter) || move.commentBefore) {
                    prefix = `${moveNumber}... `;
                }

                const span = document.createElement('span');
                span.className = 'move' + (move === this.current ? ' active' : '');
                span.textContent = prefix + (moveSan);
                span.style.cursor = 'pointer';
                span.addEventListener('click', () => {
                    this.current = move;
                    this.updateBoardToNode(move);
                    this.renderMoves();
                });
                container.appendChild(span); // anschließendes Leerzeichen in NAG-Logik verlagert

                // --- NAG (z. B. $1, $2) ---
                if (move.nag) {
                    var nagInfo = this.nagToSymbol(move.nag);
                    // nagInfo ist jetzt garantiert ein Objekt { symbol, isSymbol }
                    var symbol = nagInfo && nagInfo.symbol ? nagInfo.symbol : '';
                    var isSymbol = !!(nagInfo && nagInfo.isSymbol);

                    var nagSpan = document.createElement('span');
                    nagSpan.className = 'nag';
                    nagSpan.textContent = symbol;

                    // Wenn kein symbolischer NAG (z. B. "$99"), dann vorher ein Leerzeichen
                    if (!isSymbol) {
                        container.appendChild(document.createTextNode(' '));
                    }
                    // Hänge das NAG direkt (bei symbolischen NAGs ohne vorheriges Leerzeichen)
                    container.appendChild(nagSpan);
                    container.appendChild(document.createTextNode(' '));
                }
                else {
                    // falls kein NAG, dann Leerzeichen nach Zug
                    container.appendChild(document.createTextNode(' '));
                }

                // --- Kommentar nach dem Zug (commentAfter) ---
                if (move.commentAfter) {
                    const ca = document.createElement(isVariant ? 'span' : 'div');
                    ca.className = isVariant ? 'comment-inline' : 'comment';
                    ca.textContent = move.commentAfter;
                    container.appendChild(ca);
                    container.appendChild(document.createTextNode(' '));
                }

                if (move.variations?.length) {
                    for (const variation of move.variations) {
                        const varContainer = document.createElement('div');
                        varContainer.className = 'variant';
                        renderNode(variation, varContainer, true);
                        container.appendChild(varContainer);
                    }
                }
            });
        };

        const movesSource = this.mode === 'pgn'
            ? this.pgnObj?.history?.moves || []
            : this.moves || [];
        renderNode(movesSource, this.movesContainer, false);
        
        this.scrollActiveMoveIntoView();
    }

    scrollActiveMoveIntoView() {
        const activeMove = this.movesContainer.querySelector('.move.active');
        if (!activeMove) return;

        const scroller = this.movesContainer;
        const scrollerRect = scroller.getBoundingClientRect();
        const moveRect = activeMove.getBoundingClientRect();

        const moveHeight = Math.max(activeMove.offsetHeight || 0, moveRect.height || 0, 20);
        const scrollerVisibleHeight = scroller.clientHeight;

        // Puffer für "Sichtbarkeit" (z. B. 10% oder 2 Zeilenhöhen)
        const padding = Math.min(Math.round(scrollerVisibleHeight * 0.2), moveHeight * 2);

        const isFullyVisible =
            moveRect.top >= scrollerRect.top + padding &&
            moveRect.bottom <= scrollerRect.bottom - padding;

        if (isFullyVisible) {
            // Nichts tun → kein Ruckeln bei Zügen in gleicher Zeile
            return;
        }

        // Wenn nicht sichtbar → mittig scrollen
        const desiredTopInViewport = scrollerRect.top + (scrollerVisibleHeight / 2 - moveHeight / 2);
        const delta = moveRect.top - desiredTopInViewport;

        let targetScrollTop = scroller.scrollTop + delta;
        const maxScrollTop = Math.max(0, scroller.scrollHeight - scrollerVisibleHeight);

        if (targetScrollTop < 0) targetScrollTop = 0;
        if (targetScrollTop > maxScrollTop) targetScrollTop = maxScrollTop;

        scroller.scrollTo({
            top: targetScrollTop,
            behavior: 'auto'
        });
    }

    updateBoardToNode(node) {
        if (!node) {
            this.board.setPosition(this.startFen, false);
            return;
        }

        const fen = node.fen || this.startFen;

        // PGN oder legales FEN → chess.js laden
        if (this.mode === 'pgn' || !this.dummyBoard) {
            this.chess.load(fen);
            this.board.setPosition(fen, false);
        } else {
            // Dummy/FEN → Board direkt setzen
            this.board.setPosition(fen, false);
        }
    }

    getBranchPoint(move) {
        if (!move) return null;
        if (move.variation && move.variation.length > 0) {
            const firstMove = move.variation[0];
            if (firstMove?.previous) return firstMove.previous.next;
        }
        if (move.variations && move.variations.length > 0) return move;
        return null;
    }

    nextMove() {
        if (!this.current) {
            if (this.pgnObj.history.moves.length > 0) {
                this.current = this.pgnObj.history.moves[0];
                this.updateBoardToNode(this.current);
                this.renderMoves();
            }
            return;
        }
        if (this.current.next) {
            this.current = this.current.next;
            this.updateBoardToNode(this.current);
            this.renderMoves();
        }
    }

    prevMove() {
        if (this.current?.previous) {
            this.current = this.current.previous;
            this.updateBoardToNode(this.current);
            this.renderMoves();
        } else {
            this.current = null;
            this.updateBoardToNode(null);
            this.renderMoves();
        }
    }

    goToStart() {
        this.current = null;
        this.updateBoardToNode(null);
        this.renderMoves();
    }

    goToEnd() {
        if (this.pgnObj.history.moves.length === 0) return;
        let node = this.pgnObj.history.moves[0];
        while (node.next) node = node.next;
        this.current = node;
        this.updateBoardToNode(this.current);
        this.renderMoves();
    }

    startAutoPlay() {
        //  Toggle: falls dieser Viewer schon läuft → stoppen
        if (this.autoPlaying) {
            this.stopAutoPlay();
            return;
        }

        // Falls ein anderer Viewer läuft → stoppen
        if (currentAutoPlayer && currentAutoPlayer !== this) {
            currentAutoPlayer.stopAutoPlay();
        }

        this.autoPlaying = true;
        currentAutoPlayer = this;

        this.autoPlayInterval = setInterval(() => {
            if (!this.current) {
                if (this.pgnObj.history.moves.length > 0) {
                    this.current = this.pgnObj.history.moves[0];
                    this.updateBoardToNode(this.current);
                    this.renderMoves();
                    return;
                } else {
                    this.stopAutoPlay();
                    return;
                }
            }

            if (!this.current?.next) {
                this.stopAutoPlay();
            } else {
                this.nextMove();
            }
        }, 1500);
    }

    stopAutoPlay() {
        if (!this.autoPlaying) return;
        this.autoPlaying = false;
        if (this.autoPlayInterval) clearInterval(this.autoPlayInterval);
        this.autoPlayInterval = null;

        // wenn dieser Viewer der aktuelle war → global freigeben
        if (currentAutoPlayer === this) {
            currentAutoPlayer = null;
        }
    }

    undoMove() {
        if (!this.current) return;

        // Letzter Zug in History
        let prevMove = this.current.previous || null;

        if (!this.dummyBoard) {
            // Legal FEN / PGN → chess.js verwenden
            if (this.current.fen) {
                this.chess.load(prevMove?.fen || this.startFen);
            } else {
                this.chess.undo();
            }
        } else {
            // Dummy-Board → nur FEN setzen
            this.board.setPosition(prevMove?.fen || this.startFen, true);
        }

        // Aktueller Move zurücksetzen
        this.current = prevMove;

        this.renderMoves();
    }

   
    resetFen() {
        this.chess.load(this.startFen);
        this.moves = [];
        this.board.setPosition(this.startFen, false);
        this.renderMoves();
    }

    /* Steuerung durch Varianten mit Pfeiltasten */
    switchVariant(direction = 1) {
        if (this.current?.variations?.length) {
            const variants = this.current.variations;
            this.current = direction > 0 ? variants[0][0] : (this.getBranchPoint(variants[0][0]) || this.current);
            this.updateBoardToNode(this.current);
            this.renderMoves();
            return;
        }

        const branchPoint = this.getBranchPoint(this.current);
        if (!branchPoint || !branchPoint.variations?.length) return;

        const variants = branchPoint.variations;
        let idx = variants.findIndex(v => v.includes(this.current));

        if (idx === -1) {
            this.current = direction > 0 ? variants[0][0] : branchPoint;
        } else {
            const newIdx = idx + direction;
            if (newIdx < 0) this.current = branchPoint;
            else if (newIdx >= variants.length) this.current = branchPoint.next || branchPoint;
            else this.current = variants[newIdx][0];
        }

        this.updateBoardToNode(this.current);
        this.renderMoves();
    }

    /* Wandelt einen NAG-Code in ein Symbol um */
    nagToSymbol(nag) {
        // Mapping vom Parser-Code zum darzustellenden Symbol
        var map = {
            '$1': '!',
            '$2': '?',
            '$3': '!!',
            '$4': '??',
            '$5': '!?',
            '$6': '?!',
            '$7': '□',
            '$10': '=',
            '$13': '∞',
            '$14': '⩲',
            '$15': '⩱',
            '$16': '±',
            '$17': '∓',
            '$18': '+-',
            '$19': '-+',
            '$22': '⨀',
            '$32': '⟳',
            '$36': '→',
            '$40': '↑',
            '$132': '⇆',
            '$220': 'D'
        };

        if (nag === null || nag === undefined) {
            return { symbol: '', isSymbol: false };
        }
        // sicherstellen, dass wir mit String arbeiten
        var key = (typeof nag === 'string') ? nag : String(nag);

        if (map.hasOwnProperty(key)) {
            return { symbol: map[key], isSymbol: true }; // bekanntes Symbol, kein Leerzeichen vor dem Symbol
        }
        // Fallback: Parser-Literal wie "$99" -> behalten und als *kein* Symbol behandeln
        return { symbol: key, isSymbol: false };
    }

}

if (typeof window !== 'undefined') {
    window.PgnViewer = PgnViewer;
}

import { Pgn as cmPgn } from 'cm-pgn';
import { Chessboard, COLOR, FEN } from 'cm-chessboard';
import { Chess } from 'chess.mjs';

export class PgnViewer {
    constructor(boardContainerId, movesContainerId) {
        this.boardContainer = document.getElementById(boardContainerId);
        this.movesContainer = document.getElementById(movesContainerId);

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

        // Initialisieren
        this.initBoardPGN();

        // Controls und Board-Input
        this.registerBoardInput();
        this.registerControls();
    }

    initBoardPGN() {
        this.startFen = FEN.start;
        this.startPly = 0;
        this.pgnObj = new cmPgn(""); // leeres PGN / History-Objekt
        // virtual root: klein, nur für Insert-/UI-Logik (nicht von cm-pgn)
        this.root = {
            fen: this.startFen,
            ply: this.startPly,
            previous: null,
            next: null,
            variation: this.pgnObj.history?.moves || []
        };
        this.current = null;         // noch kein Zug gespielt
        this.board.setPosition(this.startFen, false);
    }

    registerControls() {
        document.getElementById('loadBtn').addEventListener('click', () => {
            const pgn = document.getElementById('pgnInput').value;
            this.loadPgn(pgn);
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            document.getElementById('pgnInput').value = '';
            this.chess = new Chess();
            this.initBoardPGN();
            this.renderMoves();
        });

        document.getElementById('nextBtn').addEventListener('click', () => this.nextMove());
        document.getElementById('prevBtn').addEventListener('click', () => this.prevMove());
        document.getElementById('startBtn').addEventListener('click', () => this.goToStart());
        document.getElementById('endBtn').addEventListener('click', () => this.goToEnd());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') { this.nextMove(); e.preventDefault(); }
            if (e.key === 'ArrowLeft') { this.prevMove(); e.preventDefault(); }

            if (e.key === 'ArrowDown') this.switchVariant(1);
            if (e.key === 'ArrowUp') this.switchVariant(-1);
        });

        document.getElementById('flipBtn').addEventListener('click', () => {
            this.board.setOrientation(this.board.getOrientation() === 'w' ? 'b' : 'w');
        });

        document.getElementById('autoBtn').addEventListener('click', () => {
            if (this.autoPlaying) this.stopAutoPlay();
            else this.startAutoPlay();
        });
    }

    // Vrearbeitung eigener Züge
    registerBoardInput() {
        this.board.enableMoveInput((event) => {
            if (event.type === "validateMoveInput") {
                const { squareFrom, squareTo } = event;

                // aktuelle Stellung laden (Start-FEN, wenn noch keine Züge)
                this.chess.load(this.current?.fen || this.startFen);

                // Zug im Chess-Objekt ausführen
                const move = this.chess.move({
                    from: squareFrom,
                    to: squareTo,
                    promotion: "q"
                });

                if (!move) return false;

                const san = move.san;

                // === Branchpoint bestimmen ===
                const branchPoint = this.current || this.root;

                // 1. Hauptlinie prüfen
                if (branchPoint.next && branchPoint.next.san === san) {
                    this.current = branchPoint.next;
                    this.updateBoardToNode(this.current);
                    this.renderMoves();
                    return true;
                }

                // 2. Alle Varianten prüfen
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

                // === Zug existiert noch nicht → hinzufügen ===
                let prev = this.current || null;
                if (!prev && this.root?.next) {
                    // es existiert bereits eine Hauptlinie -> wir wollen eine Variante
                    prev = this.root;
                }

                let newMove;
                try {
                    newMove = this.pgnObj.history.addMove(san, prev);
                } catch (err) {
                    console.error("addMove failed", err);
                    return false;
                }

                // Falls wir gerade aus einem Zustand ohne root.next gestartet sind,
                // stellen wir sicher, dass virtual root auf die aktuelle erste Hauptlinie zeigt.
                if (!this.root.next && this.pgnObj.history.moves.length > 0) {
                    this.root.next = this.pgnObj.history.moves[0];
                    this.root.variation = this.pgnObj.history.moves;
                }

                // Aktuellen Zug auf neu hinzugefügten Move setzen
                this.current = newMove;

                // Board updaten
                this.board.setPosition(this.chess.fen(), true);

                // Moves rendern
                this.renderMoves();

                return true;
            }
            return true;
        });
    }

    loadPgn(pgnText) {
        try {
            // PGN parsen
            this.pgnObj = new cmPgn(pgnText);

            // Start-FEN und Ply aus PGN
            this.startFen = this.pgnObj.history?.setUpFen || FEN.start;
            this.startPly = this.pgnObj.history?.startPly || 0;

            // virtual root -> verweist auf die Hauptlinie (falls vorhanden)
            this.root.variation = this.pgnObj.history?.moves || [];
            this.root.next = this.pgnObj.history?.moves?.[0] || null;

            this.current = null; // Start der Partie
            this.board.setPosition(this.startFen, false);

            // Züge rendern
            this.renderMoves();
        } catch (e) {
            console.error("PGN parse failed", e);
            // Im Fehlerfall Board zurücksetzen
            this.initBoardPGN();
            this.renderMoves();
        }
    }

    renderMoves() {
        this.movesContainer.innerHTML = '';

        const renderNode = (moves, container, isVariant = false) => {
            moves.forEach(move => {
                // Kommentar vor dem Zug
                if (move.commentBefore) {
                    const cb = document.createElement(isVariant ? 'span' : 'div');
                    cb.className = isVariant ? 'comment-inline' : 'comment';
                    cb.textContent = move.commentBefore;
                    container.appendChild(cb);
                    container.appendChild(document.createTextNode(' '));
                }

                // Zugnummer berechnen
                const zeroBased = Math.floor((move.ply - 1) / 2);
                const startMoveNumber = Math.floor(this.startPly / 2) + 1;
                const moveNumber = startMoveNumber + zeroBased;

                // Erkennen, ob der Zug der erste einer Variation ist
                const isFirstInVariation = !!(move.variation && move.variation[0] === move);

                let prefix = '';
                if (move.color === 'w') {
                    prefix = `${moveNumber}. `;
                } else {
                    // Schwarzen Zügen "..." voranstellen, wenn erster Zug einer Variante oder Kommentare
                    if (isFirstInVariation || (move.previous?.commentAfter) || move.commentBefore) {
                        prefix = `${moveNumber}... `;
                    }
                }

                // Hauptzug
                const span = document.createElement('span');
                span.className = 'move' + (move === this.current ? ' active' : '');
                span.textContent = prefix + (move.san || '(?)');
                span.style.cursor = 'pointer';
                span.addEventListener('click', () => {
                    this.current = move;
                    this.updateBoardToNode(move);
                    this.renderMoves();
                });
                container.appendChild(span);
                // Abstand zwischen Zügen
                container.appendChild(document.createTextNode(' '));

                // Kommentar nach Zug
                if (move.commentAfter) {
                    const ca = document.createElement(isVariant ? 'span' : 'div');
                    ca.className = isVariant ? 'comment-inline' : 'comment';
                    ca.textContent = move.commentAfter;
                    container.appendChild(ca);
                    container.appendChild(document.createTextNode(' '));
                }

                // Varianten rekursiv rendern (jede Variante ist ein Array)
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

        if (this.pgnObj?.history?.moves?.length) {
            renderNode(this.pgnObj.history.moves, this.movesContainer, false);
        }
        // aktiven Zug ins Sichtfeld scrollen
        const active = this.movesContainer.querySelector('.move.active');
        if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    updateBoardToNode(node) {
        const fen = node?.fen || this.startFen;
        this.chess.load(fen);
        this.board.setPosition(fen, false);
    }

    /**
     * Finde den Abzweig-Zug (branch point), an dem eine Variante entsteht.
     * @param {Object} move - Ein Move-Objekt aus History.js
     * @returns {Object|null} - Der Zug, an dem die Variante abzweigt, oder null (bei Hauptlinie).
     */
    getBranchPoint(move) {
        if (!move) return null;

        // Variante prüfen
        if (move.variation && move.variation.length > 0) {
            const firstMove = move.variation[0];
            if (firstMove?.previous) {
                return firstMove.previous.next; // Branchpoint = der Zug, auf den die Variante antwortet
            }
        }

        // Hauptlinie prüfen
        if (move.variations && move.variations.length > 0) {
            return move; // Branchpoint = Zug selbst
        }

        return null; // keine Varianten
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
        this.autoPlaying = true;
        document.getElementById('autoBtn').textContent = "Stop Auto";
        this.autoPlayInterval = setInterval(() => {
            if (!this.current?.next) this.stopAutoPlay();
            else this.nextMove();
        }, 1500);
    }

    stopAutoPlay() {
        this.autoPlaying = false;
        document.getElementById('autoBtn').textContent = "Auto Play";
        if (this.autoPlayInterval) clearInterval(this.autoPlayInterval);
        this.autoPlayInterval = null;
    }

    // Varianten-Steuerung mit den Pfeiltasten
    switchVariant(direction = 1) {
        // 1. Priorität: Varianten direkt an der aktuellen Position
        if (this.current?.variations?.length) {
            const variants = this.current.variations;
            if (direction > 0) {
                // vorwärts → erste Untervariante betreten
                this.current = variants[0][0];
            } else {
                // rückwärts → zum Branchpoint zurück
                const branchPoint = this.getBranchPoint(variants[0][0]);
                this.current = branchPoint || this.current;
            }
            this.updateBoardToNode(this.current);
            this.renderMoves();
            return;
        }

        // 2. Fallback: Varianten am übergeordneten Branchpoint
        const branchPoint = this.getBranchPoint(this.current);
        if (!branchPoint || !branchPoint.variations?.length) {
            // keine Varianten vorhanden
            return;
        }

        const variants = branchPoint.variations;
        let idx = variants.findIndex(v => v.includes(this.current));

        if (idx === -1) {
            // Wir sind in der Hauptlinie
            if (direction > 0) {
                this.current = variants[0][0];  // erste Variante betreten
            } else {
                this.current = branchPoint;     // rückwärts → Branchpoint selbst
            }
        } else {
            // Wir sind bereits in einer Variante
            const newIdx = idx + direction;

            if (newIdx < 0) {
                this.current = branchPoint; // vor der ersten Variante → Branchpoint
            } else if (newIdx >= variants.length) {
                this.current = branchPoint.next || branchPoint; // hinter der letzten Variante
            } else {
                this.current = variants[newIdx][0]; // Geschwistervariante wechseln
            }
        }

        this.updateBoardToNode(this.current);
        this.renderMoves();
    }

}

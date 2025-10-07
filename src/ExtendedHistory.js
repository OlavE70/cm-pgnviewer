/**
 * ExtendedHistory.js
 * Erweiterung von shaack/cm-pgn History.js
 * - unterstützt Undo (inkl. Varianten)
 * - optional abschaltbare Zugvalidierung
 * - gibt letzten gültigen Zug nach Entfernen zurück
 *
 * Wichtig: Wenn du dummyBoard benutzt, ruf addMove(...) mit opts { from, to, promotion } auf,
 * damit das Pseudo-Move korrekt simuliert werden kann (siehe registerBoardInput Beispiel).
 */

import { History } from "cm-pgn/history.js"
// @ts-ignore
import { Chess } from 'chess.mjs/src/Chess.js';

export class ExtendedHistory extends History {

    constructor(historyString = null, props = {}) {
        super(historyString, {
            validateMoves: true, // Schalter für optionale Validierung
            ...props
        })
    }

    // Wrapper zur Übernahme der Original-History aus cm-pgn
    static fromHistory(history) {
        const newHistory = new ExtendedHistory(null, history.props);
        newHistory.moves = history.moves; // komplette Struktur übernehmen
        return newHistory;
    }

    /** Prüft, ob ein Zug in der Hauptlinie ist */
    isMainlineMove(move) {
        return move?.variation === this.moves
    }

    /** Liefert den letzten Zug (tiefste Variante zuerst) */
    getLastMove() {
        const getDeepestLastMove = (moves) => {
            if (!moves || moves.length === 0) return null
            const last = moves[moves.length - 1]
            if (last.variations && last.variations.length > 0) {
                return getDeepestLastMove(last.variations[last.variations.length - 1])
            }
            return last
        }
        return getDeepestLastMove(this.moves)
    }

    /**
     * Entfernt einen Zug:
     * - Ohne Parameter: entfernt den letzten Zug (Undo)
     * - Mit move: löscht diesen Zug und alle Nachfolger & Varianten
     * Gibt den letzten noch gültigen Zug (vor dem gelöschten) zurück.
     */
    removeMove(move = null) {
        if (!move) {
            const lastMove = this.getLastMove()
            if (!lastMove) return null
            const prev = lastMove.previous || null
            this._removeRecursive(lastMove)
            return prev
        }

        const prev = move.previous || null
        this._removeRecursive(move)
        return prev
    }

    /**
     * Interne rekursive Löschfunktion
     * - entfernt move, alle Nachfolger & Varianten
     * - bereinigt Referenzen
     */
    _removeRecursive(move) {
        if (!move) return

        // 1. Varianten rekursiv löschen
        if (move.variations && move.variations.length > 0) {
            for (const variation of move.variations) {
                for (const varMove of [...variation]) {
                    this._removeRecursive(varMove)
                }
            }
            move.variations = []
        }

        // 2. Nachfolger löschen
        if (move.next) {
            this._removeRecursive(move.next)
            move.next = null
        }

        // 3. Aus Variation entfernen
        if (move.variation) {
            const index = move.variation.indexOf(move)
            if (index !== -1) {
                move.variation.splice(index, 1)
            }
        }

        // 4. Referenzen nach oben bereinigen
        if (move.previous) {
            move.previous.next = null
        }

        // 5. Cleanup (optional)
        move.previous = null
        move.variation = null
        move.variations = []
        move.fen = null
    }

    /** Undo-Funktion (entfernt den letzten Zug, gibt vorherigen zurück) */
    undoLastMove() {
        return this.removeMove()
    }

    /**
     * addMove:
     * - kompatibel zu History.addMove wenn validateMoves=true
     * - im Dummy-Modus: versucht legal/sloppy move; wenn das fehlschlägt,
     *   simuliert er den Zug auf einer temporären Chess-Instanz (get/put/remove),
     *   behandelt Captures, En-Passant und Promotion und erzeugt konsistente move-Felder.
     *
     * signature:
     *   addMove(notationOrMove, previous = null, sloppy = true, opts = {})
     * opts kann { from, to, promotion } enthalten (stark empfohlen für Dummy-Modus!)
     */
/** addMove mit optionaler Validierung + Varianten + smarter Promotion */
    addMove(notationOrMove, previous = null, sloppy = true, opts = {}) {
        // === 1️⃣ Wenn Validierung aktiv → Original verwenden ===
        if (this.props.validateMoves) {
            return super.addMove(notationOrMove, previous, sloppy);
        }

        // === 2️⃣ Freier Zugmodus (ohne Validierung) ===
        const startFen = previous?.fen || this.props.setUpFen || FEN.start;
        const chessTemp = new Chess(startFen, { chess960: !!this.props.chess960 });

        let applied = null;
        let providedFrom = opts.from || null;
        let providedTo = opts.to || null;
        let providedPromotion = opts.promotion || null;

        // Versuch: SAN ausführen
        if (typeof notationOrMove === "string") {
            applied = chessTemp.move(notationOrMove, { sloppy });
            if (applied) applied.fen = chessTemp.fen();
        }

        // Falls kein legaler Move: Dummy-Simulation
        if (!applied && providedFrom && providedTo) {
            // Prüfe, ob Promotion tatsächlich nötig ist
            const pieceFrom = chessTemp.get(providedFrom);
            const toRank = parseInt(providedTo[1]);
            if (pieceFrom?.type === "p" && ((pieceFrom.color === "w" && toRank === 8) ||
                                            (pieceFrom.color === "b" && toRank === 1))) {
                // echte Promotion erlaubt → Standard "q" nur falls keine angegeben
                providedPromotion = providedPromotion || "q";
            } else {
                // keine Promotion erlaubt
                providedPromotion = null;
            }

            const pseudo = this._applyPseudoMove(chessTemp, providedFrom, providedTo, providedPromotion);
            applied = this._buildAppliedFromPseudo(notationOrMove, chessTemp,
                                                providedFrom, providedTo, pseudo, previous, providedPromotion);
        }

        // Fallback, falls alles fehlschlug
        if (!applied) {
            applied = {
                san: typeof notationOrMove === "string" ? notationOrMove : String(notationOrMove),
                notation: typeof notationOrMove === "string" ? notationOrMove : String(notationOrMove),
                from: providedFrom || null,
                to: providedTo || null,
                piece: this.guessPiece(typeof notationOrMove === "string" ? notationOrMove : ""),
                color: previous?.color === "w" ? "b" : "w",
                captured: null,
                flags: "",
                fen: chessTemp.fen(),
                uci: (providedFrom && providedTo)
                    ? providedFrom + providedTo + (providedPromotion || "")
                    : null,
            };
        }

        // === 3️⃣ Move-Objekt erweitern ===
        const move = {
            ...applied,
            previous,
            ply: previous ? previous.ply + 1 : 1,
            variation: null,
            variations: [],
        };

        // === 4️⃣ In History einfügen – MIT VARIANTEN ===
        if (!previous) {
            // erster Zug
            move.variation = this.moves;
            this.moves.push(move);
        } else {
            // gibt es schon einen next-Zug?
            if (!previous.next) {
                // Hauptlinie
                previous.next = move;
                move.variation = previous.variation || this.moves;
                (previous.variation || this.moves).push(move);
            } else {
                // Neue Variante
                move.variation = [];
                previous.next.variations.push(move.variation);
                move.variation.push(move);
            }
        }

        return move;
    }

    /**
     * Simuliert einen Zug (ohne Legalitätsprüfung) auf der gegebenen Chess-Instanz.
     * - entfernt ggf. geschlagene Figur
     * - behandelt En-Passant
     * - führt Promotion (wenn promotion angegeben) aus
     *
     * Erwartet: chessTemp ist geladen mit Start-FEN
     * Return: { pieceFrom, capturedPiece, capturedSquare, isEnPassant }
     */
    _applyPseudoMove(chessTemp, from, to, promotion = null) {
        // helper: if get/put/remove not available, bail out
        if (typeof chessTemp.get !== "function" || typeof chessTemp.put !== "function" || typeof chessTemp.remove !== "function") {
            // nothing we can do - just return empty info
            return { pieceFrom: null, capturedPiece: null, capturedSquare: null, isEp: false };
        }

        const pieceFrom = chessTemp.get(from);
        const destPiece = chessTemp.get(to);

        // No piece at source -> nothing to simulate
        if (!pieceFrom) {
            return { pieceFrom: null, capturedPiece: null, capturedSquare: null, isEp: false };
        }

        let capturedPiece = destPiece || null;
        let capturedSquare = destPiece ? to : null;
        let isEp = false;

        // Detect en-passant: pawn moves diagonally to an empty square -> captured pawn sits behind 'to'
        if (!capturedPiece && pieceFrom.type === 'p' && from[0] !== to[0]) {
            const fromRank = parseInt(from[1], 10);
            const toRank = parseInt(to[1], 10);
            if (pieceFrom.color === 'w' && toRank === fromRank + 1) {
                const possibleCaptured = to[0] + (toRank - 1);
                const p = chessTemp.get(possibleCaptured);
                if (p && p.type === 'p' && p.color === 'b') {
                    capturedPiece = p;
                    capturedSquare = possibleCaptured;
                    isEp = true;
                }
            } else if (pieceFrom.color === 'b' && toRank === fromRank - 1) {
                const possibleCaptured = to[0] + (toRank + 1);
                const p = chessTemp.get(possibleCaptured);
                if (p && p.type === 'p' && p.color === 'w') {
                    capturedPiece = p;
                    capturedSquare = possibleCaptured;
                    isEp = true;
                }
            }
        }

        // Remove captured piece if any (normal capture or en-passant)
        if (capturedPiece && capturedSquare) {
            chessTemp.remove(capturedSquare);
        }

        // Remove piece from 'from' and put on 'to' (handle promotion type)
        chessTemp.remove(from);
        const newType = (promotion ? promotion.toLowerCase() : pieceFrom.type);
        chessTemp.put({ type: newType, color: pieceFrom.color }, to);

        // We did low-level updates; chessTemp.fen() now reflects piece placement (castling rights might be stale in edge cases)
        const fenAfter = chessTemp.fen();

        return { pieceFrom, capturedPiece, capturedSquare, isEp, fenAfter };
    }

    /**
     * Baut ein "applied"-Move-Objekt aus dem Ergebnis der Pseudo-Simulation.
     */
    _buildAppliedFromPseudo(notationOrMove, chessTemp, from, to, pseudoInfo, previous, promotion = null) {
        const pieceFrom = pseudoInfo.pieceFrom;
        const capturedPiece = pseudoInfo.capturedPiece;
        const isEp = pseudoInfo.isEp;
        const fenAfter = pseudoInfo.fenAfter || chessTemp.fen();

        // flags: einfache Kennzeichnung: 'c' = capture, 'e' = en-passant, 'p' = promotion, '' otherwise
        let flags = '';
        if (isEp) flags += 'e';
        if (capturedPiece) flags += 'c';
        if (promotion) flags += 'p';

        const san = this.buildSanIfNull(from, to, pieceFrom, capturedPiece, promotion, isEp);

        const applied = {
            san: san,
            notation: (typeof notationOrMove === "string" ? notationOrMove : san),
            from: from,
            to: to,
            piece: pieceFrom ? pieceFrom.type : this.guessPiece(san),
            color: pieceFrom ? pieceFrom.color : (previous?.color === 'w' ? 'b' : 'w'),
            captured: capturedPiece ? capturedPiece.type : null,
            flags: flags,
            promotion: promotion || undefined,
            fen: fenAfter,
            uci: (from && to) ? (from + to + (promotion ? promotion : "")) : null
        };

        return applied;
    }

    /**
     * Erzeugt eine SAN-Notation, wenn chess.move() nicht zur Verfügung stand.
     * (keine vollständige Disambiguierung, aber behandelt: Rochade, Capture, EnPassant, Promotion)
     */
    buildSanIfNull(from, to, pieceFrom, capturedPiece, promotion = null, isEnPassant = false) {
        if (!from || !to || !pieceFrom) {
            // Fallback: algebraic
            return (from && to) ? `${from}${to}` : (to || from || '');
        }

        // Castling?
        if (pieceFrom.type === 'k') {
            // einfache Heuristik: König bewegt sich 2 Felder -> Rochade
            if (from === 'e1' && to === 'g1') return 'O-O';
            if (from === 'e1' && to === 'c1') return 'O-O-O';
            if (from === 'e8' && to === 'g8') return 'O-O';
            if (from === 'e8' && to === 'c8') return 'O-O-O';
        }

        const dest = to;
        const pieceLetter = pieceFrom.type !== 'p' ? pieceFrom.type.toUpperCase() : '';

        if (pieceFrom.type === 'p') {
            // pawn
            if (capturedPiece || isEnPassant) {
                // exd5 style
                const fileFrom = from[0];
                return `${fileFrom}x${dest}${promotion ? '=' + promotion.toUpperCase() : ''}`;
            } else {
                return `${dest}${promotion ? '=' + promotion.toUpperCase() : ''}`;
            }
        } else {
            const captureMark = (capturedPiece || isEnPassant) ? 'x' : '';
            // no disambiguation implemented here
            return `${pieceLetter}${captureMark}${dest}${promotion ? '=' + promotion.toUpperCase() : ''}`;
        }
    }

    guessFrom(notation) {
        const match = notation.match(/([a-h][1-8])/g);
        return match?.[0] || null;
    }

    guessTo(notation) {
        const match = notation.match(/([a-h][1-8])/g);
        return match?.[1] || null;
    }

    guessPiece(notation) {
        const match = notation.match(/^[KQRNB]/);
        return match ? match[0].toLowerCase() : 'p';
    }

    guessUci(notation) {
        const match = notation.match(/^([a-h][1-8])([a-h][1-8])/);
        return match ? match[0] : null;
    }

    /** Aktiviert oder deaktiviert die Zugvalidierung */
    setValidation(enabled) {
        this.props.validateMoves = enabled;
    }
}

/**
 * ExtendedHistory.js
 * Erweiterung von shaack/cm-pgn History.js
 * - unterstützt Undo (inkl. Varianten)
 * - optional abschaltbare Zugvalidierung
 * - gibt letzten gültigen Zug nach Entfernen zurück
 */

import { History } from "cm-pgn/history.js"

export class ExtendedHistory extends History {

    constructor(historyString = null, props = {}) {
        super(historyString, {
            validateMoves: true, // Schalter für optionale Validierung
            ...props
        })
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

    /** addMove mit optionaler Validierung */
    addMove(notation, previous = null, sloppy = true) {
        if (this.props.validateMoves) {
            return super.addMove(notation, previous, sloppy)
        }

        // Freier Zugmodus: ohne Validierung
        const move = {
            san: notation,
            notation,
            previous,
            ply: previous ? previous.ply + 1 : 1,
            variation: previous ? previous.variation : this.moves,
            variations: [],
            fen: null,
            uci: null
        }

        if (previous) {
            previous.next = move
            previous.variation.push(move)
        } else {
            this.moves.push(move)
        }

        return move
    }

    /** Aktiviert oder deaktiviert die Zugvalidierung */
    setValidation(enabled) {
        this.props.validateMoves = !!enabled
    }
}

# PGN Viewer basierend auf chessmail.de-Komponenten

Ein Chess PGN-Viewer für Browser, der Partien aus `<pgn>`-Tags darstellt. Unterstützt Navigation, Auto-Play, Varianten, Kommentare und responsive Layouts.
ARIA-konforme Button für möglichst barrierearme / barrierefreie Bedienung.

## Dateien & Aufgaben

* **index.html** – Beispielseite mit `<pgn>`-, `<fen>`- und `<board>´-Tags für Partien und FEN-Stellungen.
* **cm-pgnviewer.css** – Styles für Board, Moves-Liste, Buttons und PGN-Text; responsive Layout.
* **src/cm-pgnadapter.js** – Adapter für Legacy-Seiten (`$.cmPgnViewer()`), ruft `initPgnViewers()`.
* **src/cm-pgnwrapper.js** – Wrapper, der `<pgn>`-Tags usw. erkennt, Viewer-Container aufbaut und `PgnViewer` initialisiert.
* **src/cm-pgnviewer.js** – Kernklasse `PgnViewer`: Board- und Partie-Logik, PGN / FEN laden, Moves rendern, Varianten & Kommentare anzeigen, Auto-Play, Tastatursteuerung, Board-Input.
* **src/ExtendedHistory.js** - erweitert die History-Klasse von cm-pgn um Zugzurücknahme und freie Zugeingabe (ohne Validierung).

## Abhängigkeiten

* cm-chessboard 
* cm-pgn
* chess.mjs
> siehe https://github.com/shaack. 

## Container-Aufbau

```
pgnViewerContainer
├─ viewer-header       # Header (optional)
├─ mainContent         # Flex-Container
│  ├─ boardColumn      # Linke Spalte: Board + Buttons
│  │  ├─ outerBoard
│  │  │  └─ board     # Schachbrett
│  │  └─ buttons       # Steuerung
│  └─ movesColumn      # Rechte Spalte: Moves-Liste
└─ pgnText             # Optional: PGN-Text unterhalb
```

* Responsive: kleine Bildschirme → `mainContent` als `column`, Moves-Liste scrollt innerhalb des Containers.

## Nutzung

1. `<pgn>`, `<fen>`oder `<board>`-Tags in HTML einfügen:

```html
<pgn>
1. e4 e5 2. Nf3 Nc6 3. Bb5 a6
</pgn>

<fen author="Loyd, Samuel" source="New York Commercial Advertiser, 1897" stipulation="#2">3R3B/Q7/5nK1/3n4/3NkNR1/2p2p2/2P2P2/8</fen>

<board author="Loyd, Samuel" source="New York Commercial Advertiser, 1897" stipulation="#2">3R3B/Q7/5nK1/3n4/3NkNR1/2p2p2/2P2P2/8</board>
```
> pgn: Stellt Spiele und Kommentierungen dar.  
> fen: Board aus einer FEN-Stellung ohne Zugvalidierung. Nullzüge sind erlaubt, Zugregeln werden ignoriert. En passant und Promotion werden erkannt.  
> board: Board aus einer FEN-Stellung, jedoch mit Validierung / Regelkonformität. Die FEN muss entsprechend sorgfältig um e. p. etc. aufgebaut werden, falls relevant.  
> Die FEN wird ggf. um 'w - - 0 1' ergänzt, falls lediglich die Brettstellung angegeben wird (vgl. index.html). 

2. Adapter (für ältere Browser) oder direkt Wrapper laden:

```html
<script src="src/cm-pgnadapter.js"></script>
```

&nbsp;&nbsp;&nbsp;alternativ / ohne jQuery: 
```html
<script type="module">
  import { initPgnViewers } from './src/cm-pgnwrapper.js';

  // Initialisiere alle <pgn>-Tags auf der Seite
  initPgnViewers();
</script>
```

3. CSS laden:

```html
<link rel="stylesheet" href="cm-pgnviewer.css">
```
> Ggf. weitere stylesheets für Chessboard und Extensions beachten.

4. Viewer initialisiert sich automatisch (optional `$.cmPgnViewer()`).

5. Steuerung:

   * Zugeingabe am Board mit Drag & Drop. Aktiver Zug ist hervorgehoben.
   * Varianteneingabe möglich (aktiver Zug muss derjenige vor dem Zug sein, zu dem die Variante gespielt wird).
   * Tastatur: Pfeiltasten für Züge & Varianten, Space zusätzlich für Next
   * Buttons für `<pgn>`: Flip, Start, Prev, Auto, Next, End, Show PGN
   * Buttons für`<fen>`und `<board>`: Flip, Undo und Reset.

> Mehrere Viewer auf einer Seite möglich, sie sind jeweils unabhängig.

6. Beachten:
   * Viewport-Breite für kleine Bildschirme in cm-pgnviewer im Abschnitt Media.
   * Imports werden übre Vite gesetzt. Ggf. anpassen.
   * Innerhalb von cm-pgnviewer.js im Konstruktor /cm-chessboard-assets/ beachten! Manuelle Anpassung ggf. erforderlich.


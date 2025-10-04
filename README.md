# CM PGN Viewer

Ein schlanker Chess PGN-Viewer für Browser, der Partien aus `<pgn>`-Tags darstellt. Unterstützt Navigation, Auto-Play, Varianten, Kommentare und responsive Layouts.
ARIA-konforme Button für möglichst barrierearme / barrierefreie Bedienung.

## Dateien & Aufgaben

* **index.html** – Beispielseite mit `<pgn>`-Tags für Partien.
* **cm-pgnviewer.css** – Styles für Board, Moves-Liste, Buttons und PGN-Text; responsive Layout.
* **src/cm-pgnadapter.js** – Adapter für Legacy-Seiten (`$.cmPgnViewer()`), ruft `initPgnViewers()`.
* **src/cm-pgnwrapper.js** – Wrapper, der `<pgn>`-Tags erkennt, Viewer-Container aufbaut und `PgnViewer` initialisiert.
* **src/cm-pgnviewer.js** – Kernklasse `PgnViewer`: Board- und Partie-Logik, PGN laden, Moves rendern, Varianten & Kommentare anzeigen, Auto-Play, Tastatursteuerung, Board-Input.

## Abhängigkeiten

* cm-chessboard
* cm-pgn
* chess.mjs
>> siehe https://github.com/shaack. 

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

1. `<pgn>`-Tags in HTML einfügen:

```html
<pgn>
1. e4 e5 2. Nf3 Nc6 3. Bb5 a6
</pgn>
```

2. Adapter/Wrapper laden:

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

4. Viewer initialisiert sich automatisch (optional `$.cmPgnViewer()`).

5. Steuerung:

   * Buttons: Flip, Start, Prev, Auto, Next, End, Show PGN
   * Tastatur: Pfeiltasten für Züge & Varianten, Space zusätzlich für Next
   * Board-Input erlaubt Drag&Drop und neue Züge

> Mehrere Viewer auf einer Seite möglich, jeweils unabhängig.

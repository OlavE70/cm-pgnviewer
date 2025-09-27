// cm-pgnadapter.js
// Adapter ist die Schnittstelle zwischen Forum / Webseite mit <pgn> PGN-Game </pgn> und Wrapper / Viewer

import { initPgnViewers } from "./cm-pgnwrapper.js";

/**
 * Adapter für Kompatibilität mit der Original-Seite.
 * Stellt $.cmPgnViewer() bereit, ruft intern aber den neuen Wrapper auf.
 */
(function ($) {
  if (!$) {
    console.error("jQuery nicht gefunden. Bitte sicherstellen, dass jQuery vor cm-pgnadapter.js geladen wird.");
    return;
  }

  /**
   * Kompatibilitäts-Funktion: $.cmPgnViewer()
   * Erwartet die gleiche Signatur wie auf der Originalseite,
   * ruft intern aber initPgnViewers() auf.
   */
  $.cmPgnViewer = function () {
    // einfach neuen Wrapper starten
    initPgnViewers();
  };

})(window.jQuery);

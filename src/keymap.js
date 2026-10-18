'use strict';
/*
 * Mapeo de KeyboardEvent.code (navegador) -> keycode numerico de Mechvibes.
 * Tomado de la tabla oficial de Mechvibes (src/libs/keycodes.js, standard + win32).
 * Asi los packs descargados de Mechvibes suenan en la tecla correcta.
 */
const KEYCODE_MAP = {
  Escape: 1,
  F1: 59, F2: 60, F3: 61, F4: 62, F5: 63, F6: 64,
  F7: 65, F8: 66, F9: 67, F10: 68, F11: 87, F12: 88,

  Backquote: 41,
  Digit1: 2, Digit2: 3, Digit3: 4, Digit4: 5, Digit5: 6,
  Digit6: 7, Digit7: 8, Digit8: 9, Digit9: 10, Digit0: 11,
  Minus: 12, Equal: 13, Backspace: 14,

  Tab: 15, CapsLock: 58,
  KeyA: 30, KeyB: 48, KeyC: 46, KeyD: 32, KeyE: 18, KeyF: 33,
  KeyG: 34, KeyH: 35, KeyI: 23, KeyJ: 36, KeyK: 37, KeyL: 38,
  KeyM: 50, KeyN: 49, KeyO: 24, KeyP: 25, KeyQ: 16, KeyR: 19,
  KeyS: 31, KeyT: 20, KeyU: 22, KeyV: 47, KeyW: 17, KeyX: 45,
  KeyY: 21, KeyZ: 44,

  BracketLeft: 26, BracketRight: 27, Backslash: 43,
  Semicolon: 39, Quote: 40, Enter: 28,
  Comma: 51, Period: 52, Slash: 53,
  Space: 57,

  ShiftLeft: 42, ShiftRight: 54,
  ControlLeft: 29, ControlRight: 3613,
  AltLeft: 56, AltRight: 3640,
  MetaLeft: 3675, MetaRight: 3676, ContextMenu: 3677,

  ArrowUp: 57416, ArrowLeft: 57419, ArrowRight: 57421, ArrowDown: 57424,

  Insert: 3666, Delete: 3667, Home: 3655, End: 3663,
  PageUp: 3657, PageDown: 3665,
  PrintScreen: 3639, ScrollLock: 70, Pause: 3653,

  NumLock: 69, NumpadDivide: 3637, NumpadMultiply: 55, NumpadSubtract: 74,
  NumpadAdd: 78, NumpadEnter: 3612, NumpadDecimal: 83,
  Numpad0: 82, Numpad1: 79, Numpad2: 80, Numpad3: 81, Numpad4: 75,
  Numpad5: 76, Numpad6: 77, Numpad7: 71, Numpad8: 72, Numpad9: 73
};

// ---- Layout del teclado en pantalla (estilo TKL) ----
// Cada tecla: { c: code, l: label, w: ancho en unidades (1 por defecto), cls: clase extra }
const K = (c, l, w, cls) => ({ c, l, w: w || 1, cls: cls || '' });
const SP = (w) => ({ spacer: true, w });

const LAYOUT_MAIN = [
  // fila de funciones
  [
    K('Escape', 'Esc'), SP(0.5),
    K('F1', 'F1'), K('F2', 'F2'), K('F3', 'F3'), K('F4', 'F4'), SP(0.5),
    K('F5', 'F5'), K('F6', 'F6'), K('F7', 'F7'), K('F8', 'F8'), SP(0.5),
    K('F9', 'F9'), K('F10', 'F10'), K('F11', 'F11'), K('F12', 'F12')
  ],
  [
    K('Backquote', '~'), K('Digit1', '1'), K('Digit2', '2'), K('Digit3', '3'),
    K('Digit4', '4'), K('Digit5', '5'), K('Digit6', '6'), K('Digit7', '7'),
    K('Digit8', '8'), K('Digit9', '9'), K('Digit0', '0'), K('Minus', '-'),
    K('Equal', '='), K('Backspace', '⌫', 2, 'wide')
  ],
  [
    K('Tab', 'Tab', 1.5, 'wide'), K('KeyQ', 'Q'), K('KeyW', 'W'), K('KeyE', 'E'),
    K('KeyR', 'R'), K('KeyT', 'T'), K('KeyY', 'Y'), K('KeyU', 'U'), K('KeyI', 'I'),
    K('KeyO', 'O'), K('KeyP', 'P'), K('BracketLeft', '['), K('BracketRight', ']'),
    K('Backslash', '\\', 1.5, 'wide')
  ],
  [
    K('CapsLock', 'Caps', 1.75, 'wide'), K('KeyA', 'A'), K('KeyS', 'S'), K('KeyD', 'D'),
    K('KeyF', 'F'), K('KeyG', 'G'), K('KeyH', 'H'), K('KeyJ', 'J'), K('KeyK', 'K'),
    K('KeyL', 'L'), K('Semicolon', ';'), K('Quote', "'"),
    K('Enter', 'Enter', 2.25, 'wide accent')
  ],
  [
    K('ShiftLeft', 'Shift', 2.25, 'wide'), K('KeyZ', 'Z'), K('KeyX', 'X'), K('KeyC', 'C'),
    K('KeyV', 'V'), K('KeyB', 'B'), K('KeyN', 'N'), K('KeyM', 'M'), K('Comma', ','),
    K('Period', '.'), K('Slash', '/'), K('ShiftRight', 'Shift', 2.75, 'wide')
  ],
  [
    K('ControlLeft', 'Ctrl', 1.25, 'wide'), K('MetaLeft', 'Win', 1.25, 'wide'),
    K('AltLeft', 'Alt', 1.25, 'wide'), K('Space', '', 6.25, 'space'),
    K('AltRight', 'Alt', 1.25, 'wide'), K('MetaRight', 'Win', 1.25, 'wide'),
    K('ContextMenu', '≡', 1.25, 'wide'), K('ControlRight', 'Ctrl', 1.25, 'wide')
  ]
];

// Cluster de navegacion + flechas (lado derecho)
const LAYOUT_NAV = [
  [K('Insert', 'Ins'), K('Home', 'Home'), K('PageUp', 'PgUp')],
  [K('Delete', 'Del'), K('End', 'End'), K('PageDown', 'PgDn')]
];
const LAYOUT_ARROWS = [
  [SP(1), K('ArrowUp', '↑'), SP(1)],
  [K('ArrowLeft', '←'), K('ArrowDown', '↓'), K('ArrowRight', '→')]
];

window.TOKKYO_KEYMAP = { KEYCODE_MAP, LAYOUT_MAIN, LAYOUT_NAV, LAYOUT_ARROWS };

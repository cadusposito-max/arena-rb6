const paths = {
  ball: '<circle cx="12" cy="12" r="9"/><path d="M4 9c5 1 8-2 10-6m-2 9c4-1 6-1 9 1m-9-1c1 4-1 7-3 9m3-9-6-5"/>',
  target:
    '<circle cx="12" cy="12" r="7"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/><circle cx="12" cy="12" r="1"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20v-2a7 7 0 0 1 14 0v2"/>',
  arrow: '<path d="M6 18 18 6M6 6h12v12"/>',
  share:
    '<circle cx="18" cy="5" r="3"/><circle cx="5" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8 10 7-4m-7 8 7 4"/>',
  teams:
    '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m0-15a3 3 0 0 1 0 6m2 3a5 5 0 0 1 4 5"/>',
  game: '<circle cx="12" cy="12" r="9"/><path d="M4 9c5 1 8-2 10-6m-2 9c4-1 6-1 9 1m-9-1c1 4-1 7-3 9m3-9-6-5"/>',
  bracket: '<path d="M3 3h5v5H3zm0 13h5v5H3zm13-7h5v5h-5zM8 5h4v13H8m4-7h4"/>',
  check: '<path d="m5 12 4 4 10-10"/><circle cx="12" cy="12" r="10"/>',
  trophy:
    '<path d="M7 3h10v6a5 5 0 0 1-10 0V3Zm0 2H3v2a5 5 0 0 0 5 5m9-7h4v2a5 5 0 0 1-5 5m-4 3v5m-4 1h8"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  layers: '<path d="m2 8 10-5 10 5-10 5-10-5Zm0 5 10 5 10-5M2 17l10 5 10-5"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  flag: '<path d="M5 22V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h1m-1 6h1m-1 6h1"/>',
  image:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  paste:
    '<path d="M9 4h6v3H9zM8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2M9 12h6m-6 4h4"/>',
  trash: '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  shuffle:
    '<path d="M3 7h3c4 0 6 10 10 10h5m0 0-3-3m3 3-3 3M3 17h3c1.6 0 2.8-1.6 4-3.5M21 7h-5c-1.6 0-2.8 1.6-4 3.5M21 7l-3-3m3 3-3 3"/>',
  mirror: '<path d="M3 5h4v4H3zm0 10h4v4H3zm14-10h4v4h-4zm0 10h4v4h-4zM7 7h3v5h4V7h3M7 17h3v-5m4 0v5h3M12 3v2m0 14v2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4l2-2Z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/>',
  megaphone:
    '<path d="M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1Zm14-1a4 4 0 0 1 0 6m2.5-9a8 8 0 0 1 0 12"/>',
  shareios:
    '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M8 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2"/>',
};
export function icon(name) {
  return (
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    (paths[name] || "") +
    "</svg>"
  );
}

// Identidade das duplas: cor + símbolo.
export const palette = [
  ["#0e7660", "Verde-mar"],
  ["#ee6420", "Laranja"],
  ["#1f5fbf", "Azul"],
  ["#c0265a", "Framboesa"],
  ["#6d3fc0", "Roxo"],
  ["#c98a00", "Ouro"],
  ["#2a8f3a", "Verde"],
  ["#d6402b", "Vermelho"],
  ["#0f8aa3", "Turquesa"],
  ["#7a4b2a", "Coco"],
  ["#333f48", "Grafite"],
  ["#e0569a", "Rosa"],
];
const glyphs = {
  sol: [
    "Sol",
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  ],
  onda: [
    "Onda",
    '<path d="M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 9c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/>',
  ],
  coqueiro: [
    "Coqueiro",
    '<path d="M12 11c-1 4-1 7 0 11M12 11c-2-3-6-4-9-2m9 2c2-3 6-4 9-2m-9 2c-3-1-6 1-7 4m7-4c3-1 6 1 7 4M12 11c0-3 1-6 4-8"/>',
  ],
  raio: ["Raio", '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'],
  fogo: [
    "Fogo",
    '<path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-4 5-4 8-1-1-2-2-2-4-2 2-3 5-3 8 0 4 3 7 7 7z"/>',
  ],
  coroa: ["Coroa", '<path d="M3 19h18M4 8l4 4 4-7 4 7 4-4-2 9H6z"/>'],
  estrela: [
    "Estrela",
    '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  ],
  ancora: [
    "Âncora",
    '<circle cx="12" cy="5" r="2.5"/><path d="M12 7.5V21M8 11h8M4 13a8 8 0 0 0 16 0"/>',
  ],
  tubarao: ["Tubarão", '<path d="M2 19h20M5 19c4-3 6-9 6-15 4 4 7 9 8 15"/>'],
  bola: ["Bola", paths.ball],
  gaivota: ["Gaivota", '<path d="M2 9c4-1 7 1 10 5 3-4 6-6 10-5"/>'],
  coracao: [
    "Coração",
    '<path d="M12 20s-8-5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11z"/>',
  ],
};
export const glyphNames = Object.keys(glyphs);
export const glyphLabel = (name) => glyphs[name]?.[0] ?? "";
export function glyph(name) {
  return (
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    (glyphs[name] || glyphs.bola)[1] +
    "</svg>"
  );
}
const HEX = /^#[0-9a-f]{6}$/i;
export const isColor = (c) => HEX.test(String(c || ""));
export const isGlyph = (g) => Object.hasOwn(glyphs, String(g || ""));
export function defaultIdentity(index) {
  return {
    c: palette[index % palette.length][0],
    i: glyphNames[(index * 5 + Math.floor(index / 12)) % glyphNames.length],
  };
}
let current = [];
export function useProfiles(list) {
  current = Array.isArray(list) ? list : [];
}
export function identity(id) {
  const p = current[id - 1] || {},
    d = defaultIdentity(id - 1);
  return {
    c: isColor(p.c) ? p.c : d.c,
    i: isGlyph(p.i) ? p.i : d.i,
    a: String(p.a || ""),
    b: String(p.b || ""),
    n: String(p.n || ""),
  };
}
export function crest(id) {
  if (!id) return '<span class="unknown" aria-hidden="true">?</span>';
  const p = identity(id);
  return (
    '<span aria-hidden="true" class="crest idc" style="--c:' +
    p.c +
    '">' +
    glyph(p.i) +
    "</span>"
  );
}

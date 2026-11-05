export const slots = [
  ["S1", "S2"],
  ["S3", "S4"],
  ["S5", "S6"],
  ["S7", "S8"],
  ["S9", "S10"],
  ["S11", "S12"],
  ["S13", "S14"],
  ["S15", "S16"],
  ["S17", "V1"],
  ["V2", "S18"],
  ["P2", "P9"],
  ["P10", "P1"],
  ["V9", "V3"],
  ["V4", "V5"],
  ["V6", "V7"],
  ["V8", "V10"],
  ["V12", "P8"],
  ["P7", "P6"],
  ["P5", "P4"],
  ["P3", "V11"],
  ["V17", "P13"],
  ["V18", "P14"],
  ["V19", "P15"],
  ["V20", "P16"],
  ["V13", "V14"],
  ["V15", "V16"],
  ["V21", "V22"],
  ["V23", "V24"],
  ["P26", "V27"],
  ["P25", "V28"],
  ["V25", "V29"],
  ["V26", "V30"],
  ["P31", "P32"],
  ["V31", "V32"],
];
export const matchNumber = (n) => String(n).padStart(2, "0");
export function resolveEdition(edition) {
  const games = {};
  function resolve(ref) {
    const id = Number(ref.slice(1));
    if (ref[0] === "S") return id;
    const origin = games[id];
    if (!origin?.winner) return null;
    return ref[0] === "V" ? origin.winner : origin.loser;
  }
  slots.forEach((refs, i) => {
    const teams = refs.map(resolve);
    const score = edition.results[i + 1];
    const win =
      score && teams.every(Boolean) ? Number(score[1] > score[0]) : null;
    games[i + 1] = {
      number: i + 1,
      refs,
      teams,
      score,
      winner: win === null ? null : teams[win],
      loser: win === null ? null : teams[1 - win],
    };
  });
  return games;
}
export function sourceLabel(ref) {
  const labels = { S: "Vaga", V: "Vencedor J", P: "Perdedor J" };
  return (
    labels[ref[0]] + (ref[0] === "S" ? " " : "") + matchNumber(ref.slice(1))
  );
}
export function routes(number) {
  return slots.flatMap((refs, i) =>
    refs.includes("V" + number) || refs.includes("P" + number)
      ? [
          {
            outcome: refs.includes("V" + number) ? "Vencedor" : "Perdedor",
            number: i + 1,
          },
        ]
      : [],
  );
}
export const demo = {
  id: "demo",
  title: "Copa da Praia",
  public: true,
  version: 1,
  can_edit: false,
  teams: [
    "Léo e Davi",
    "Mari e Bia",
    "Iara e Júlia",
    "Igor e André",
    "Luana e Mel",
    "Duda e Carol",
    "Gui e Vini",
    "João e Pedro",
    "Téo e Raul",
    "Luna e Ana",
    "Nina e Gabi",
    "Luca e Caio",
    "Sofia e Isa",
    "Ivo e Tom",
    "Dani e Lívia",
    "Breno e Hugo",
    "Rafa e Lucas",
    "Bia e Lara",
  ],
  results: {
    1: [18, 14],
    2: [15, 18],
    3: [18, 12],
    4: [14, 18],
    5: [18, 16],
    6: [18, 11],
    7: [13, 18],
    8: [18, 14],
    9: [18, 15],
    10: [12, 18],
    11: [18, 13],
    12: [14, 18],
  },
  archived: false,
};

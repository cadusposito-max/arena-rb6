/* Motor da chave: dupla eliminação (quem perde duas vezes está fora).
   Cada jogo é um par de origens: "S7" = vaga 7, "V12" = vencedor do jogo 12,
   "P12" = perdedor do jogo 12. Os jogos estão em ordem: um jogo só depende de
   jogos com número menor.

   Os 4 últimos jogos são sempre: semifinal 1, semifinal 2, 3º lugar e final.
   Os 2 anteriores são os cruzamentos (perdedor da principal × sobrevivente da
   repescagem). */

export const MIN_TEAMS = 6;
export const MAX_TEAMS = 32;

/** Modelo v1 (18 duplas, 34 jogos): usado pelas edições criadas antes da chave flexível. */
export const legacy = [
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

/* Ordem clássica das vagas na chave (1×8, 4×5, 2×7, 3×6…): as vagas sem
   adversário na 1ª rodada ficam espalhadas pelos dois lados. */
function seedOrder(size) {
  let order = [1];
  while (order.length < size) {
    const sum = order.length * 2 + 1;
    order = order.flatMap((s) => [s, sum - s]);
  }
  return order;
}

/** Gera a chave de dupla eliminação para `n` duplas (2n − 2 jogos). */
export function generate(n) {
  if (!Number.isInteger(n) || n < MIN_TEAMS || n > MAX_TEAMS)
    throw new RangeError(`A chave aceita de ${MIN_TEAMS} a ${MAX_TEAMS} duplas.`);
  const size = 2 ** Math.ceil(Math.log2(n)),
    rounds = Math.log2(size), // a rodada `rounds` seria a final da principal
    games = [],
    add = (a, b) => (games.push([a, b]), games.length);
  // Principal: rodadas 1 .. rounds-1, até sobrarem 2 invictos (um de cada lado).
  let alive = seedOrder(size).map((s) => (s <= n ? "S" + s : null));
  const drops = []; // drops[r] = [perdedores do lado esquerdo, do lado direito]
  function mainRound(r) {
    const next = [],
      lost = [[], []];
    for (let i = 0; i < alive.length; i += 2) {
      const a = alive[i],
        b = alive[i + 1],
        half = i < alive.length / 2 ? 0 : 1;
      if (a && b) {
        const g = add(a, b);
        next.push("V" + g);
        lost[half].push("P" + g);
      } else next.push(a || b); // folga: entra direto na rodada seguinte
    }
    alive = next;
    drops[r] = lost;
  }
  // Repescagem em dois lados. Os perdedores trocam de lado a cada rodada
  // (evita reencontro cedo com quem já enfrentaram).
  const pools = [[], []];
  const sideOf = (half, r) => (half + r + 1) % 2;
  const incoming = (r) => {
    const inc = [[], []];
    drops[r].forEach((list, half) =>
      inc[sideOf(half, r)].push(...(r % 2 ? list : [...list].reverse())),
    );
    return inc;
  };
  function lowerStep(r) {
    const inc = incoming(r),
      next = r + 1 <= rounds - 2 ? incoming(r + 1) : null;
    for (const side of [0, 1]) {
      let pool = pools[side];
      const fresh = inc[side],
        target = next ? Math.max(1, next[side].length) : 1,
        m = Math.min(pool.length, fresh.length),
        played = [];
      // quem já está na repescagem enfrenta quem acabou de cair
      for (let i = 0; i < m; i++) played.push("V" + add(pool[i], fresh[i]));
      pool = [...played, ...pool.slice(m), ...fresh.slice(m)];
      // e a repescagem se reduz até o tamanho certo para a próxima leva
      while (pool.length > target) {
        const c = Math.min(Math.floor(pool.length / 2), pool.length - target),
          won = [];
        for (let i = 0; i < c; i++) won.push("V" + add(pool[2 * i], pool[2 * i + 1]));
        pool = [...won, ...pool.slice(2 * c)];
      }
      pools[side] = pool;
    }
  }
  mainRound(1);
  for (let r = 2; r <= rounds - 1; r++) {
    mainRound(r);
    lowerStep(r - 1);
  }
  const [left, right] = alive,
    [[lostLeft], [lostRight]] = drops[rounds - 1];
  // Cruzamentos: o perdedor de um lado da principal vai para o outro lado.
  const x0 = add(lostRight, pools[0][0]),
    x1 = add(lostLeft, pools[1][0]);
  const s0 = add(left, "V" + x0),
    s1 = add(right, "V" + x1);
  add("P" + s0, "P" + s1); // 3º lugar
  add("V" + s0, "V" + s1); // final
  return games;
}

const cache = new Map();
/** Estrutura da chave de uma edição (a do banco, se vier; senão pelo nº de duplas). */
export function graphOf(edition) {
  if (Array.isArray(edition?.slots) && edition.slots.length) return edition.slots;
  const n = edition?.teams?.length ?? 18;
  if (edition?.template === 1 || (!edition?.template && n === 18 && edition?.id !== "demo"))
    return legacy;
  if (!cache.has(n)) cache.set(n, generate(n));
  return cache.get(n);
}

const num = (ref) => Number(ref.slice(1));
/** Partes da chave: principal, repescagem, cruzamentos e finais. */
export function shape(graph) {
  const M = graph.length,
    final = M,
    third = M - 1,
    semis = [M - 3, M - 2],
    cross = [M - 5, M - 4];
  const kids = (n) => graph[n - 1].filter((r) => r[0] === "V").map(num);
  const mainRoots = semis.map((s, i) => {
    const other = graph[s - 1].find((r) => !(r[0] === "V" && num(r) === cross[i]));
    return other?.[0] === "V" ? num(other) : null;
  });
  const lowerRoots = cross.map((x) => {
    const r = graph[x - 1].find((r) => r[0] === "V");
    return r ? num(r) : null;
  });
  const collect = (root, set) => {
    if (!root || set.has(root)) return;
    set.add(root);
    kids(root).forEach((k) => collect(k, set));
  };
  const main = new Set(),
    lower = new Set();
  mainRoots.forEach((r) => collect(r, main));
  lowerRoots.forEach((r) => collect(r, lower));
  for (let n = 1; n < cross[0]; n++) if (!main.has(n)) lower.add(n);
  const stage = (n) =>
    n === final
      ? "final"
      : n === third
        ? "third"
        : semis.includes(n)
          ? "semi"
          : cross.includes(n)
            ? "cross"
            : main.has(n)
              ? "main"
              : "lower";
  return { total: M, final, third, semis, cross, mainRoots, lowerRoots, main, lower, kids, stage };
}

export const matchNumber = (n) => String(n).padStart(2, "0");
export function resolveEdition(edition) {
  const graph = graphOf(edition),
    games = {};
  function resolve(ref) {
    const id = num(ref);
    if (ref[0] === "S") return id;
    const origin = games[id];
    if (!origin?.winner) return null;
    return ref[0] === "V" ? origin.winner : origin.loser;
  }
  graph.forEach((refs, i) => {
    const teams = refs.map(resolve);
    const score = edition.results[i + 1];
    const win = score && teams.every(Boolean) ? Number(score[1] > score[0]) : null;
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
  return labels[ref[0]] + (ref[0] === "S" ? " " : "") + matchNumber(ref.slice(1));
}
export function routes(graph, number) {
  return graph.flatMap((refs, i) =>
    refs.includes("V" + number) || refs.includes("P" + number)
      ? [{ outcome: refs.includes("V" + number) ? "Vencedor" : "Perdedor", number: i + 1 }]
      : [],
  );
}

/* Demonstração: 18 duplas na chave nova, com os primeiros jogos decididos. */
const demoTeams = [
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
];
const demoGraph = generate(demoTeams.length);
const demoScores = [
  [18, 14], [15, 18], [18, 12], [14, 18], [18, 16], [18, 11], [13, 18], [18, 14],
  [18, 15], [12, 18], [18, 13], [14, 18],
];
export const demo = {
  id: "demo",
  title: "Copa da Praia",
  public: true,
  version: 1,
  can_edit: false,
  template: 100 + demoTeams.length,
  slots: demoGraph,
  teams: demoTeams,
  results: Object.fromEntries(demoScores.map((s, i) => [i + 1, s])),
  archived: false,
};

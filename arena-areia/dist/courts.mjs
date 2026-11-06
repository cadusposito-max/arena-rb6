/* Quadras: qual jogo está em cada quadra e quem é chamado quando uma libera.
   `live` é um mapa quadra → jogo ({ "1": 5, "2": 7 }). Antes do primeiro placar
   ele não existe: os primeiros jogos prontos ocupam as quadras sem aviso. */

export const MAX_COURTS = 8;
export const clampCourts = (c) => Math.max(1, Math.min(MAX_COURTS, Math.floor(+c) || 1));

/** Jogos prontos (duas duplas definidas, sem placar), na ordem da chave. */
export const readyGames = (games) =>
  Object.values(games)
    .filter((g) => !g.score && g.teams.every(Boolean))
    .map((g) => g.number)
    .sort((a, b) => a - b);

/** Quadra → jogo em andamento agora. */
export function liveCourts(edition, games) {
  const courts = clampCourts(edition.courts),
    live = {},
    ready = new Set(readyGames(games));
  if (edition.live && typeof edition.live === "object") {
    for (const [c, n] of Object.entries(edition.live)) {
      const k = Number(c);
      if (k >= 1 && k <= courts && ready.has(Number(n))) live[k] = Number(n);
    }
    return live;
  }
  [...ready].slice(0, courts).forEach((n, i) => (live[i + 1] = n));
  return live;
}

/** Ocupa as quadras livres com os próximos jogos prontos. */
export function fillCourts(live, games, courts) {
  const next = { ...live },
    busy = new Set(Object.values(next)),
    queue = readyGames(games).filter((n) => !busy.has(n)),
    called = [];
  for (let c = 1; c <= clampCourts(courts) && queue.length; c++)
    if (!next[c]) {
      const n = queue.shift();
      next[c] = n;
      called.push([c, n]);
    }
  return { live: next, called, queue };
}

/** Depois de um placar: libera a quadra de quem terminou e chama os próximos.
 *  `before`/`after`: jogos resolvidos antes e depois do placar.
 *  Devolve o novo mapa, quem foi chamado ([quadra, jogo]) e quem ficou pronto mas espera quadra. */
export function afterResult(edition, before, after) {
  const live = liveCourts(edition, before);
  for (const [c, n] of Object.entries(live)) if (after[n]?.score) delete live[c];
  const res = fillCourts(live, after, edition.courts),
    wasReady = new Set(readyGames(before));
  return { live: res.live, called: res.called, queued: res.queue.filter((n) => !wasReady.has(n)) };
}

export function courtOf(live, n) {
  for (const [c, x] of Object.entries(live)) if (x === n) return Number(c);
  return null;
}
/** Posição do jogo na fila (1 = próximo a ser chamado), ou null se não está na fila. */
export function queuePosition(live, games, n) {
  const busy = new Set(Object.values(live)),
    i = readyGames(games)
      .filter((x) => !busy.has(x))
      .indexOf(n);
  return i < 0 ? null : i + 1;
}

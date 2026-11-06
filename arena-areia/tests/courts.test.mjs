import test from "node:test";
import assert from "node:assert/strict";
import { generate, resolveEdition } from "../dist/engine.mjs";
import { liveCourts, afterResult, readyGames, queuePosition, courtOf, clampCourts } from "../dist/courts.mjs";

const edition = (n, courts) => ({
  slots: generate(n),
  teams: Array.from({ length: n }, (_, i) => "Dupla " + (i + 1)),
  results: {},
  courts,
  live: null,
});

test("no começo os primeiros jogos ocupam as quadras, sem aviso", () => {
  const e = edition(13, 2),
    games = resolveEdition(e),
    live = liveCourts(e, games);
  assert.deepEqual(live, { 1: readyGames(games)[0], 2: readyGames(games)[1] });
  assert.equal(queuePosition(live, games, readyGames(games)[2]), 1);
  assert.equal(courtOf(live, readyGames(games)[1]), 2);
  assert.equal(clampCourts(0), 1);
  assert.equal(clampCourts(99), 8);
});

test("campeonatos inteiros com 1 a 4 quadras: chamada automática sem conflito", () => {
  let seed = 7;
  const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  for (const n of [6, 9, 13, 18, 24, 32])
    for (const courts of [1, 2, 3, 4]) {
      const e = edition(n, courts),
        total = 2 * n - 2,
        first = new Set(Object.values(liveCourts(e, resolveEdition(e)))),
        calledEver = new Set();
      let played = 0;
      while (played < total) {
        const before = resolveEdition(e),
          live = liveCourts(e, before),
          onCourt = Object.values(live);
        assert.ok(onCourt.length, `${n}/${courts}: nenhuma quadra em jogo e faltam jogos`);
        // termina um jogo qualquer que está em quadra
        const g = onCourt[Math.floor(rand() * onCourt.length)];
        e.results = { ...e.results, [g]: rand() < 0.5 ? [18, 12] : [12, 18] };
        played++;
        const after = resolveEdition(e),
          res = afterResult(e, before, after);
        e.live = res.live;
        const now = Object.values(res.live);
        // cada jogo em no máximo uma quadra, e nenhuma dupla em duas quadras
        assert.equal(new Set(now).size, now.length);
        const teams = now.flatMap((x) => after[x].teams);
        assert.equal(new Set(teams).size, teams.length, `${n}/${courts}: dupla em duas quadras`);
        // quadra livre só se não houver ninguém na fila
        if (now.length < courts) assert.equal(readyGames(after).length, now.length);
        for (const [, x] of res.called) {
          assert.ok(!first.has(x), "jogo inicial não deve ser chamado");
          assert.ok(!calledEver.has(x), "jogo chamado duas vezes");
          calledEver.add(x);
        }
        // quem ficou pronto e não ganhou quadra está na fila
        for (const x of res.queued) assert.ok(queuePosition(res.live, after, x) >= 1);
      }
      // todo jogo que não começou em quadra foi chamado
      assert.equal(calledEver.size + first.size, total, `${n} duplas, ${courts} quadras`);
    }
});

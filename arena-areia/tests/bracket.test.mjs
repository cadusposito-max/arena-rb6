import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  legacy,
  generate,
  graphOf,
  shape,
  resolveEdition,
  demo,
  routes,
  MIN_TEAMS,
  MAX_TEAMS,
} from "../dist/engine.mjs";

const sizes = Array.from({ length: MAX_TEAMS - MIN_TEAMS + 1 }, (_, i) => MIN_TEAMS + i);
const range = (n) => Array.from({ length: n }, (_, i) => i + 1);

/** Estrutura válida: sem ciclos, cada vaga entra uma vez, cada resultado vai para no máximo um jogo. */
function checkGraph(graph, teams) {
  const seeds = [],
    used = new Set();
  graph.forEach((pair, i) => {
    assert.equal(pair.length, 2);
    assert.notEqual(pair[0], pair[1]);
    for (const ref of pair) {
      assert.match(ref, /^[SVP]\d+$/);
      const n = Number(ref.slice(1));
      if (ref[0] === "S") seeds.push(n);
      else {
        assert.ok(n >= 1 && n < i + 1, `jogo ${i + 1} depende de um jogo posterior (${ref})`);
        assert.ok(!used.has(ref), `${ref} usado duas vezes`);
        used.add(ref);
      }
    }
  });
  assert.deepEqual(seeds.sort((a, b) => a - b), range(teams));
}

test("modelo v1 (edições antigas) continua igual", () => {
  checkGraph(legacy, 18);
  for (const [n, pair] of [
    [11, ["P2", "P9"]],
    [29, ["P26", "V27"]],
    [31, ["V25", "V29"]],
    [34, ["V31", "V32"]],
  ])
    assert.deepEqual(legacy[n - 1], pair);
  assert.deepEqual(routes(legacy, 25), [
    { outcome: "Perdedor", number: 30 },
    { outcome: "Vencedor", number: 31 },
  ]);
  const s = shape(legacy);
  assert.deepEqual(s.mainRoots, [25, 26]);
  assert.deepEqual(s.lowerRoots, [27, 28]);
  assert.equal(s.main.size, 16);
  assert.equal(graphOf({ template: 1, teams: Array(18).fill("x") }), legacy);
});

test("a chave é gerada para qualquer número de duplas de 6 a 32", () => {
  for (const n of sizes) {
    const g = generate(n);
    assert.equal(g.length, 2 * n - 2, `${n} duplas`);
    checkGraph(g, n);
    const s = shape(g);
    // toda partida pertence a exatamente uma parte da chave
    assert.equal(s.main.size + s.lower.size + 6, g.length, `${n} duplas: partes`);
    assert.ok(s.mainRoots.every(Boolean));
    assert.equal(s.main.size, n - 2);
  }
  assert.throws(() => generate(5));
  assert.throws(() => generate(33));
  assert.throws(() => generate(12.5));
});

test("milhares de campeonatos simulados terminam sem dupla repetida e com eliminação dupla", () => {
  let seed = 20261105;
  const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  for (const n of sizes) {
    const g = generate(n),
      s = shape(g),
      edition = { slots: g, teams: range(n).map(String), results: {} };
    for (let k = 0; k < 120; k++) {
      edition.results = {};
      for (let m = 1; m <= g.length; m++) edition.results[m] = rand() < 0.5 ? [18, 12] : [11, 18];
      const games = resolveEdition(edition),
        losses = new Map();
      for (const m of Object.values(games)) {
        assert.ok(m.winner && m.loser, `${n} duplas: jogo ${m.number} sem duplas`);
        assert.notEqual(m.winner, m.loser);
        // ninguém joga depois de perder duas vezes (até as semifinais)
        if (m.number < s.semis[0])
          for (const t of m.teams) assert.ok((losses.get(t) ?? 0) < 2, `${n}: dupla ${t} jogou eliminada`);
        losses.set(m.loser, (losses.get(m.loser) ?? 0) + 1);
      }
      const podium = [games[s.final].winner, games[s.final].loser, games[s.third].winner, games[s.third].loser];
      assert.equal(new Set(podium).size, 4);
      // quem não chegou às semifinais saiu com exatamente duas derrotas
      for (const t of range(n)) if (!podium.includes(t)) assert.equal(losses.get(t), 2, `${n}: dupla ${t}`);
    }
  }
});

test("a correção recalcula as vagas e a demonstração é consistente", () => {
  const e = { template: 1, teams: range(18).map(String), results: { 1: [7, 4] } };
  assert.equal(resolveEdition(e)[9].teams[1], 1);
  e.results[1] = [4, 7];
  assert.equal(resolveEdition(e)[9].teams[1], 2);
  assert.equal(resolveEdition(e)[12].teams[1], 1);
  assert.equal(graphOf(demo).length, 2 * demo.teams.length - 2);
  for (const g of Object.values(resolveEdition(demo)))
    if (g.score) assert.ok(g.teams.every(Boolean));
});

// O backend (supabase/) fica só no computador, fora do repositório público.
const MIGRATION = new URL("../supabase/migrations/202611050006_chave_flexivel.sql", import.meta.url);
test("banco tem a mesma chave gerada para cada número de duplas", { skip: !existsSync(MIGRATION) && "supabase/ fora do repositório" }, () => {
  const sql = readFileSync(MIGRATION, "utf8");
  for (const n of sizes) assert.ok(sql.includes(`(${100 + n},'${JSON.stringify(generate(n))}',${n})`), `${n} duplas`);
});
const PUSH_FN = new URL("../supabase/functions/arena-push/index.ts", import.meta.url);
test("função de avisos usa o modelo v1 como reserva", { skip: !existsSync(PUSH_FN) && "supabase/ fora do repositório" }, () => {
  const src = readFileSync(PUSH_FN, "utf8");
  const block = src.match(/const legacy = (\[[\s\S]*?\]);/)[1];
  assert.deepEqual(JSON.parse(block.replace(/\s+/g, "").replace(/,\]/g, "]")), legacy);
});

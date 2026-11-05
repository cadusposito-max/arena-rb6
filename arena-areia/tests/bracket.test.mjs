import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { slots, resolveEdition, demo, routes } from "../dist/engine.mjs";
test("modelo sem ciclos e com 18 vagas únicas", () => {
  const seeds = [];
  slots.forEach((pair, i) => {
    assert.equal(pair.length, 2);
    for (const ref of pair) {
      const n = Number(ref.slice(1));
      if (ref[0] === "S") seeds.push(n);
      else assert.ok(n >= 1 && n < i + 1);
    }
  });
  assert.deepEqual(
    seeds.sort((a, b) => a - b),
    Array.from({ length: 18 }, (_, i) => i + 1),
  );
  const sql = readFileSync(
    new URL(
      "../supabase/migrations/202611050001_arena_r6.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(sql.includes(JSON.stringify(slots)));
});
test("repescagem e finais seguem o desenho", () => {
  for (const [n, pair] of [
    [11, ["P2", "P9"]],
    [12, ["P10", "P1"]],
    [29, ["P26", "V27"]],
    [30, ["P25", "V28"]],
    [31, ["V25", "V29"]],
    [32, ["V26", "V30"]],
    [33, ["P31", "P32"]],
    [34, ["V31", "V32"]],
  ])
    assert.deepEqual(slots[n - 1], pair);
  assert.deepEqual(routes(25), [
    { outcome: "Perdedor", number: 30 },
    { outcome: "Vencedor", number: 31 },
  ]);
});
test("512 edições completas sem equipe duplicada em uma partida ou no pódio", () => {
  let seed = 20261105;
  for (let k = 0; k < 512; k++) {
    const results = {};
    for (let n = 1; n <= 34; n++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      results[n] = seed > 0x7fffffff ? [7, 3] : [2, 7];
    }
    const g = resolveEdition({ results });
    for (const m of Object.values(g)) {
      assert.ok(m.winner && m.loser);
      assert.notEqual(m.winner, m.loser);
    }
    assert.equal(
      new Set([g[34].winner, g[34].loser, g[33].winner, g[33].loser]).size,
      4,
    );
  }
});
test("a correção recalcula as vagas na chave e a demonstração é consistente", () => {
  const e = { results: { 1: [7, 4] } };
  assert.equal(resolveEdition(e)[9].teams[1], 1);
  e.results[1] = [4, 7];
  assert.equal(resolveEdition(e)[9].teams[1], 2);
  assert.equal(resolveEdition(e)[12].teams[1], 1);
  for (const g of Object.values(resolveEdition(demo)))
    if (g.score) assert.ok(g.teams.every(Boolean));
});
// O backend (supabase/) fica só no computador, fora do repositório público.
const PUSH_FN = new URL("../supabase/functions/arena-push/index.ts", import.meta.url);
test("função de avisos usa o mesmo grafo da chave", { skip: !existsSync(PUSH_FN) && "supabase/ fora do repositório" }, () => {
  const src = readFileSync(PUSH_FN, "utf8");
  const block = src.match(/const slots = (\[[\s\S]*?\]);/)[1];
  assert.deepEqual(JSON.parse(block.replace(/\s+/g, "").replace(/,\]/g, "]")), slots);
});

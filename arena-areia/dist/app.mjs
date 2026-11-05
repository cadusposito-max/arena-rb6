import {
  demo,
  slots,
  matchNumber as num,
  resolveEdition,
  sourceLabel,
  routes,
} from "./engine.mjs";
import {
  icon,
  crest,
  identity,
  useProfiles,
  glyph,
  glyphNames,
  glyphLabel,
  palette,
  defaultIdentity,
  isColor,
  isGlyph,
} from "./icons.mjs";
import { client, rpc } from "./cloud.js";
import {
  myTeam,
  follow,
  unfollow,
  notifyGames,
  pushSupported,
  permission,
  isIOS,
  isStandalone,
  registerWorker,
  canPromptInstall,
  onInstallChange,
  promptInstall,
} from "./push.mjs";
const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let editions = [],
  edition = demo,
  games = resolveEdition(demo),
  view = "bracket",
  branch = "all",
  filter = "all",
  user = null,
  full = false,
  revision = 0;
// Link curto da edição: ?copa-da-praia (aceita também o antigo ?edicao=<id>).
function requested() {
  const u = new URL(location.href),
    old = u.searchParams.get("edicao");
  if (old) return old;
  const first = u.search.slice(1).split("&")[0];
  return first && !first.includes("=") ? decodeURIComponent(first).toLowerCase() : null;
}
const slugify = (t) =>
  String(t || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "") || "edicao";
// Nomes repetidos: a edição mais antiga fica com o nome puro, as outras ganham 4 letras do id.
function slugOf(e) {
  if (!e || e.id === "demo") return "demo";
  const base = slugify(e.title),
    same = editions.filter((x) => slugify(x.title) === base),
    oldest = same[same.length - 1];
  return !oldest || oldest.id === e.id ? base : base + "-" + e.id.slice(0, 4);
}
function findEdition(all, tok) {
  if (!tok) return null;
  const hit = all.find((e) => e.id === tok || slugOf(e) === tok);
  if (hit) return hit;
  const m = tok.match(/^(.*)-([0-9a-f]{4})$/);
  if (m) {
    const byId = all.find((e) => e.id.startsWith(m[2]) && slugify(e.title) === m[1]);
    if (byId) return byId;
  }
  const same = all.filter((e) => slugify(e.title) === tok);
  return same[same.length - 1] || null;
}
function editionUrl(e) {
  const u = new URL(location.href);
  u.search = "?" + slugOf(e);
  u.hash = "";
  return u;
}
const count = () => Object.keys(edition.results).length;
const status = () =>
  edition.archived ? "Encerrado" : count() ? "Em andamento" : "A iniciar";
const team = (id, ref) => (id ? edition.teams[id - 1] : sourceLabel(ref));
const dialog = $("#dialog");
const dialogBody = $("#dialog-body");
const btn = (act, label, primary = false) =>
  '<button type="button" class="btn ' +
  (primary ? "primary" : "") +
  '" data-act="' +
  act +
  '">' +
  label +
  "</button>";
function icons() {
  document
    .querySelectorAll("i[data-i]")
    .forEach((el) => (el.innerHTML = icon(el.dataset.i)));
}
const COVERS = "arena-capas";
const COVER_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|webp)$/;
const coverUrl = (path) =>
  COVER_PATH.test(path || "")
    ? client.storage.from(COVERS).getPublicUrl(path).data.publicUrl
    : "";
function modal(title, html, wide = false) {
  dialog.classList.toggle("wide", wide);
  $("#dialog-title").textContent = title;
  dialogBody.innerHTML = html + '<p role="alert" class="error"></p>';
  if (!dialog.open) dialog.showModal();
}
function notify(msg) {
  $("#toast").textContent = msg;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => ($("#toast").textContent = ""), 3200);
}
function setEdition(e, changeUrl = true) {
  edition = e;
  games = resolveEdition(e);
  view = "bracket";
  branch = "all";
  full = false;
  filter = "all";
  if (changeUrl) {
    history.pushState({}, "", editionUrl(e));
  }
  render();
}
async function refresh() {
  const ticket = ++revision;
  try {
    const all = await rpc("list");
    if (ticket !== revision) return;
    editions = all;
    const id = requested();
    const picked =
      id === "demo"
        ? demo
        : findEdition(all, id) || (!id && all[0]) || demo;
    $("#net").textContent =
      id && id !== "demo" && picked === demo
        ? "Esta edição está indisponível para sua conta. Exibindo a demonstração."
        : "";
    // Links antigos (?edicao=<id>) viram o link curto.
    if (id && picked !== demo && id !== slugOf(picked))
      history.replaceState({}, "", editionUrl(picked));
    if (picked.id !== edition.id) setEdition(picked, false);
    else if (
      picked.version !== edition.version ||
      picked.can_edit !== edition.can_edit
    ) {
      edition = picked;
      games = resolveEdition(picked);
      render();
    }
  } catch {
    if (ticket === revision)
      $("#net").textContent =
        "Falha ao sincronizar com o servidor. Tente atualizar a página.";
  }
}
function render() {
  useProfiles(edition.profiles);
  mySlot = myTeam(edition.id)?.slot ?? null;
  renderFollow();
  const cover = coverUrl(edition.cover);
  $(".hero-art").style.setProperty(
    "--cover",
    cover ? 'url("' + encodeURI(cover) + '")' : "",
  );
  const parts = edition.title.trim().split(/\s+/),
    last = parts.pop();
  $("#title").innerHTML = esc(parts.join(" ")) + " <em>" + esc(last) + "</em>";
  $("#crumb-title").textContent = edition.title;
  document.title = edition.title + " · ARENA RB6";
  $("#status").textContent = status();
  $("#edition-type").textContent =
    edition.id === "demo"
      ? "Edição demonstrativa"
      : edition.public
        ? "Edição pública"
        : "Edição privada";
  const metrics = [
    ["teams", "18", "Duplas inscritas"],
    ["bracket", "34", "Jogos na chave"],
    ["check", String(count()).padStart(2, "0"), "Jogos concluídos"],
    ["flag", Math.round((count() / 34) * 100) + "%", "Progresso da edição"],
  ];
  $("#metrics").innerHTML = metrics
    .map(
      ([i, n, label]) =>
        '<div class="metric"><span class="metric-icon">' +
        icon(i) +
        "</span><div><strong>" +
        n +
        "</strong><small>" +
        label +
        "</small>" +
        (i === "flag"
          ? '<span class="meter" aria-hidden="true"><b style="width:' +
            n +
            '"></b></span>'
          : "") +
        "</div></div>",
    )
    .join("");
  const adminTabBtn = $('[data-view="admin"]');
  adminTabBtn.hidden = !canAdmin();
  if (view === "admin" && !canAdmin()) view = "bracket";
  document.querySelectorAll("[data-view]").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === view);
    b.setAttribute("aria-pressed", b.dataset.view === view);
  });
  const tabs = $(".viewtabs"),
    active = tabs.querySelector(".active");
  if (active)
    tabs.scrollLeft = Math.max(
      0,
      active.offsetLeft - (tabs.clientWidth - active.offsetWidth) / 2,
    );
  renderSection();
}
/* ---------- Minha dupla e avisos no celular ---------- */
let mySlot = null;
function nextFor(slot) {
  const pending = Object.values(games).find(
    (g) => !g.score && g.teams.includes(slot),
  );
  if (pending) {
    const other = pending.teams.find((t) => t !== slot);
    return (
      "Próximo: <b>Jogo " +
      num(pending.number) +
      "</b> " +
      (other
        ? "contra " + esc(edition.teams[other - 1])
        : "· adversário a definir")
    );
  }
  const place = [
    games[34].winner,
    games[34].loser,
    games[33].winner,
    games[33].loser,
  ].indexOf(slot);
  if (place >= 0) return "Campanha encerrada · <b>" + (place + 1) + "º lugar</b>";
  return "Campanha encerrada nesta edição";
}
function renderFollow() {
  const box = $("#follow");
  if (!box) return;
  const me = myTeam(edition.id),
    install = canPromptInstall()
      ? '<button class="btn" data-act="install">' +
        icon("download") +
        "Instalar app</button>"
      : isIOS && !isStandalone()
        ? '<button class="btn" data-act="iosHelp">' +
          icon("download") +
          "Instalar app</button>"
        : "";
  if (!me) {
    box.innerHTML =
      '<div class="follow-card"><span class="follow-icon">' +
      icon("bell") +
      '</span><div class="follow-text"><strong>Avisos no celular</strong><span>Escolha a sua dupla e receba uma notificação quando for a hora de jogar.</span></div><div class="follow-actions">' +
      install +
      '<button class="btn primary" data-act="followOpen">' +
      icon("bell") +
      "Ativar avisos</button></div></div>";
    return;
  }
  const p = identity(me.slot),
    blocked = me.push && permission() === "denied",
    pushOn = me.push && !blocked;
  box.innerHTML =
    '<div class="follow-card on" style="--c:' +
    p.c +
    '">' +
    crest(me.slot) +
    '<div class="follow-text"><small>Você segue</small><strong>' +
    esc(edition.teams[me.slot - 1]) +
    "</strong><span>" +
    nextFor(me.slot) +
    '</span></div><div class="follow-actions"><span class="chip ' +
    (pushOn ? "ok" : "off") +
    '">' +
    icon("bell") +
    (pushOn ? "Avisos ligados" : blocked ? "Avisos bloqueados" : "Sem avisos") +
    "</span>" +
    (!pushOn && edition.id !== "demo"
      ? '<button class="btn primary" data-act="pushOn">Ligar avisos</button>'
      : "") +
    install +
    '<button class="btn" data-act="followOpen">Trocar</button><button class="btn" data-act="unfollow">Parar</button></div></div>';
}
function chooseTeam() {
  const iosBlocked = isIOS && !isStandalone();
  modal(
    "Qual é a sua dupla?",
    '<div class="stack"><p class="help">Toque na sua dupla. Não pedimos nome, e-mail nem telefone: a escolha fica só neste aparelho e serve para destacar seus jogos e mandar os avisos.</p>' +
      (edition.id === "demo"
        ? '<p class="note">Esta é a edição de demonstração: a dupla fica destacada, mas os avisos só são enviados nas edições oficiais.</p>'
        : iosBlocked
          ? '<p class="note">No iPhone, os avisos só funcionam com o app instalado. Escolha a dupla agora e depois toque em <b>Instalar app</b> para ver como.</p>'
          : !pushSupported()
            ? '<p class="note">Este navegador não recebe avisos. A dupla fica destacada mesmo assim.</p>'
            : "") +
      '<div class="pick-grid">' +
      edition.teams
        .map((name, i) => {
          const p = identity(i + 1);
          return (
            '<button type="button" class="pick-team' +
            (i + 1 === mySlot ? " on" : "") +
            '" data-follow-slot="' +
            (i + 1) +
            '" style="--c:' +
            p.c +
            '">' +
            crest(i + 1) +
            "<span><b>" +
            esc(name) +
            "</b><small>" +
            (p.n && p.a && p.b ? esc(p.a + " & " + p.b) + " · " : "") +
            "Vaga " +
            num(i + 1) +
            "</small></span></button>"
          );
        })
        .join("") +
      "</div></div>",
    true,
  );
}
function iosHelp() {
  modal(
    "Instalar no iPhone",
    '<div class="stack"><ol class="steps"><li>Abra este site no <b>Safari</b>.</li><li>Toque em <b>Compartilhar</b> ' +
      icon("shareios") +
      " na barra de baixo.</li><li>Escolha <b>Adicionar à Tela de Início</b> e confirme.</li><li>Abra a ARENA RB6 pelo ícone novo e toque em <b>Ligar avisos</b>.</li></ol><p class=\"help\">É exigência da Apple: no iPhone, só apps instalados na tela inicial recebem notificações de sites.</p></div>",
  );
}
async function startFollow(slot, withPushRequested = true) {
  const withPush =
    withPushRequested &&
    edition.id !== "demo" &&
    pushSupported() &&
    !(isIOS && !isStandalone());
  const name = edition.teams[slot - 1];
  try {
    const r = await follow(edition.id, slot, withPush);
    if (dialog.open) dialog.close();
    render();
    notify(
      r.push
        ? "Avisos ligados para " + name
        : "Pronto! " + name + " fica destacada neste aparelho",
    );
    if (!withPush && isIOS && !isStandalone() && edition.id !== "demo")
      iosHelp();
  } catch (e) {
    render();
    if (dialog.open) {
      const el = dialogBody.querySelector(".error");
      if (el) el.textContent = e.message;
    } else notify(e.message);
  }
}
onInstallChange(() => renderFollow());

const branchNames = {
  all: "Chave completa",
  main: "Principal",
  lower: "Repescagem",
  final: "Finais",
};
/* Layout da chave: cada jogo tem coluna e posição vertical (px do topo do card).
   Os cards têm 80px de altura e os fios ligam o centro deles. */
const ROW = 90;
function layout(kind) {
  const cards = [],
    titles = [],
    tags = [],
    seps = [];
  const at = (top) => (r) => top + r * ROW;
  const put = (col, y, ...pairs) =>
    pairs.forEach(([n, r]) => cards.push([n, col, y(r)]));
  if (kind === "all") {
    const up = at(68),
      low = at(866);
    tags.push([0, 6, "Chave principal"], [0, 800, "Repescagem"]);
    seps.push([0, 4, 786]);
    put(0, up, [1, 0], [3, 1], [4, 2], [5, 3], [6, 4], [7, 5], [8, 6], [2, 7]);
    put(1, up, [9, 0], [10, 7]);
    put(2, up, [13, 0.5], [14, 2.5], [15, 4.5], [16, 6.5]);
    put(3, up, [25, 1.5], [26, 5.5]);
    put(0, low, [12, 0], [11, 3]);
    put(1, low, [17, 0], [18, 1], [19, 2], [20, 3]);
    put(2, low, [21, 0], [22, 1], [23, 2], [24, 3]);
    put(3, low, [27, 0.5], [28, 2.5]);
    put(4, low, [29, 0.5], [30, 2.5]);
    const s1 = (up(1.5) + low(0.5)) / 2,
      s2 = (up(5.5) + low(2.5)) / 2;
    put(5, (y) => y, [31, s1], [32, s2]);
    put(6, (y) => y, [34, (s1 + s2) / 2], [33, low(2.5)]);
    titles.push(
      [0, 40, "1ª rodada"],
      [1, 40, "Vagas 17 e 18"],
      [2, 40, "2ª rodada"],
      [3, 40, "Classificatórias"],
      [0, 836, "Entrada"],
      [1, 836, "1ª rodada"],
      [2, 836, "2ª rodada"],
      [3, 836, "3ª rodada"],
      [4, 836, "Classificatórias"],
      [5, s1 - 30, "Semifinais"],
      [6, (s1 + s2) / 2 - 30, "Final"],
      [6, low(2.5) - 30, "3º lugar"],
    );
  } else if (kind === "main") {
    const y = at(48);
    put(0, y, [1, 0], [3, 1], [4, 2], [5, 3], [6, 4], [7, 5], [8, 6], [2, 7]);
    put(1, y, [9, 0], [10, 7]);
    put(2, y, [13, 0.5], [14, 2.5], [15, 4.5], [16, 6.5]);
    put(3, y, [25, 1.5], [26, 5.5]);
    put(4, y, [31, 1.5], [32, 5.5]);
    titles.push(
      [0, 18, "1ª rodada"],
      [1, 18, "Vagas 17 e 18"],
      [2, 18, "2ª rodada"],
      [3, 18, "Classificatórias"],
      [4, 18, "Semifinais"],
    );
  } else if (kind === "lower") {
    const y = at(48);
    put(0, y, [12, 0], [11, 3]);
    put(1, y, [17, 0], [18, 1], [19, 2], [20, 3]);
    put(2, y, [21, 0], [22, 1], [23, 2], [24, 3]);
    put(3, y, [27, 0.5], [28, 2.5]);
    put(4, y, [29, 0.5], [30, 2.5]);
    titles.push(
      [0, 18, "Entrada"],
      [1, 18, "1ª rodada"],
      [2, 18, "2ª rodada"],
      [3, 18, "3ª rodada"],
      [4, 18, "Classificatórias"],
    );
  } else {
    const y = at(48);
    put(0, y, [31, 0], [32, 1.8]);
    put(1, y, [34, 0.9], [33, 2.8]);
    titles.push(
      [0, 18, "Semifinais"],
      [1, y(0.9) - 30, "Final"],
      [1, y(2.8) - 30, "3º lugar"],
    );
  }
  return { cards, titles, tags, seps };
}
function phaseState(g) {
  return g.score
    ? ["", "Concluído"]
    : g.teams.every(Boolean)
      ? ["blue", "Disponível"]
      : ["gray", "A definir"];
}
function matchCard(g, x, y, w) {
  const [cls, label] = phaseState(g);
  return (
    '<button class="match' +
    (g.number === 34 ? " is-final" : "") +
    '" data-game="' +
    g.number +
    '" style="left:' +
    x +
    "px;top:" +
    y +
    "px;width:" +
    w +
    'px"><span class="match-head">' +
    (g.number === 34 ? icon("trophy") + "FINAL" : "JOGO " + num(g.number)) +
    '<span class="state"><i class="dot ' +
    cls +
    '"></i>' +
    label +
    "</span></span>" +
    g.teams
      .map(
        (id, i) =>
          '<span class="teamline ' +
          (id && id === g.winner ? "winner" : "") +
          (id && id === mySlot ? " mine" : "") +
          '">' +
          crest(id) +
          '<span class="tname ' +
          (id ? "" : "placeholder") +
          '">' +
          esc(team(id, g.refs[i])) +
          "</span><strong>" +
          (g.score ? g.score[i] : "–") +
          "</strong></span>",
      )
      .join("") +
    "</button>"
  );
}
/* Escala: em tela cheia a chave inteira cabe na tela; fora dela ajusta à largura. */
const MIN_Z = 0.3,
  MAX_Z = 2;
let zoom = null,
  lastScale = 1;
function graph() {
  const container = $(".canvas");
  if (!container) return;
  const { cards, titles, tags, seps } = layout(branch),
    w = branch === "final" ? 250 : 206,
    gap = 40,
    step = w + gap,
    pad = 22,
    xOf = (col) => pad + col * step,
    positions = {};
  cards.forEach(([n, col, y]) => (positions[n] = { x: xOf(col), y }));
  const lines = [];
  for (const [n, to] of Object.entries(positions))
    for (const ref of games[n].refs) {
      if (ref[0] === "S") continue;
      const from = positions[Number(ref.slice(1))];
      if (!from || from.x >= to.x) continue;
      const loser = ref[0] === "P";
      if (loser && branch === "all") continue;
      const x = from.x + w,
        y = from.y + 40,
        mid = x + Math.min(gap / 2, (to.x - x) / 2) + (loser ? 6 : 0);
      lines.push(
        '<path class="' +
          (loser ? "loser" : "") +
          '" d="M' +
          x +
          " " +
          y +
          " H" +
          mid +
          " V" +
          (to.y + 40) +
          " H" +
          to.x +
          '"/>',
      );
    }
  seps.forEach(([c0, c1, y]) =>
    lines.push(
      '<path class="sep" d="M' + pad + " " + y + " H" + (xOf(c1) + w) + '"/>',
    ),
  );
  const cols = Math.max(...cards.map((c) => c[1])) + 1,
    width = pad * 2 + (cols - 1) * step + w,
    height = Math.max(...cards.map((c) => c[2])) + 80 + pad;
  const cs = getComputedStyle(container),
    availW =
      container.clientWidth -
      parseFloat(cs.paddingLeft) -
      parseFloat(cs.paddingRight) -
      2,
    availH =
      container.clientHeight -
      parseFloat(cs.paddingTop) -
      parseFloat(cs.paddingBottom) -
      2;
  let auto = full
    ? Math.min(availW / width, availH / height, 1.25)
    : Math.min(availW / width, 1);
  // Tela estreita (celular em pé): caber tudo deixaria ilegível; ajusta pela altura.
  if (full && auto < 0.45) auto = Math.max(0.45, Math.min(availH / height, 1));
  if (!full) auto = Math.max(auto, availW < 640 ? 0.9 : 0.72);
  const s = Math.max(MIN_Z, Math.min(MAX_Z, zoom ?? auto));
  lastScale = s;
  container.classList.toggle("fits", s * width <= availW + 1);
  container.innerHTML =
    '<div class="graph-wrap" style="width:' +
    Math.ceil(width * s) +
    "px;height:" +
    Math.ceil(height * s) +
    'px"><div class="graph" style="width:' +
    width +
    "px;height:" +
    height +
    "px;transform:scale(" +
    s +
    ')"><svg class="wires" fill="none">' +
    lines.join("") +
    "</svg>" +
    tags
      .map(
        ([col, y, text]) =>
          '<div class="section-tag" style="left:' +
          xOf(col) +
          "px;top:" +
          y +
          'px">' +
          text +
          "</div>",
      )
      .join("") +
    titles
      .map(
        ([col, y, text]) =>
          '<div class="round-title" style="left:' +
          xOf(col) +
          "px;top:" +
          y +
          'px">' +
          text +
          "</div>",
      )
      .join("") +
    Object.entries(positions)
      .map(([n, p]) => matchCard(games[n], p.x, p.y, w))
      .join("") +
    "</div></div>";
  const val = $(".zoom-val");
  if (val) val.textContent = Math.round(s * 100) + "%";
}
/* ==========================================================
   Painel do organizador
   ========================================================== */
const canAdmin = () =>
  Boolean(edition.can_edit && edition.id !== "demo");
let adminTab = "scores",
  pushStats = {},
  statsFor = "",
  statsAt = 0;
function stageName(n) {
  if (n === 34) return "Final";
  if (n === 33) return "Disputa de 3º lugar";
  if (n === 31 || n === 32) return "Semifinal";
  if (n <= 8) return "Principal · 1ª rodada";
  if (n <= 10) return "Principal · vagas 17 e 18";
  if (n <= 12) return "Repescagem · entrada";
  if (n <= 16) return "Principal · 2ª rodada";
  if (n <= 20) return "Repescagem · 1ª rodada";
  if (n <= 24) return "Repescagem · 2ª rodada";
  if (n <= 26) return "Principal · classificatória";
  if (n <= 28) return "Repescagem · 3ª rodada";
  return "Repescagem · classificatória";
}
function draftFromEdition() {
  return {
    title: edition.title,
    visible: edition.public !== false,
    slots: edition.teams.map((name, i) => {
      const p = identity(i + 1);
      let { a, b, n } = p;
      if (!a && !b && !n) {
        const parsed = parseTeams(name)[0] || { a: "", b: "" };
        if (parsed.a && parsed.b) ({ a, b } = parsed);
        else n = name;
      }
      return { a, b, n, c: p.c, i: p.i };
    }),
  };
}
async function loadStats(force = false) {
  if (!canAdmin()) return;
  const key = edition.id + ":" + edition.version;
  if (!force && statsFor === key && Date.now() - statsAt < 20000) return;
  statsFor = key;
  statsAt = Date.now();
  try {
    pushStats = (await rpc("push_stats", { p_id: edition.id })) || {};
  } catch {
    pushStats = {};
  }
  document.querySelectorAll("[data-bell]").forEach((el) => {
    const n = pushStats[el.dataset.bell] || 0;
    el.innerHTML = n ? icon("bell") + n : "";
    el.title = n
      ? n + " celular(es) com aviso ligado"
      : "Nenhum celular com aviso ligado";
  });
}
function scoreRow(g) {
  const done = Boolean(g.score),
    n = g.number;
  const side = (i) => {
    const id = g.teams[i];
    return (
      '<label class="sr-team' +
      (done && id === g.winner ? " win" : "") +
      '">' +
      crest(id) +
      '<span class="sr-name">' +
      esc(team(id, g.refs[i])) +
      '<small class="bells" data-bell="' +
      id +
      '"></small></span><input name="s' +
      i +
      '" type="number" inputmode="numeric" min="0" max="999" required value="' +
      (g.score?.[i] ?? "") +
      '" aria-label="Placar de ' +
      esc(team(id, g.refs[i])) +
      '"></label>'
    );
  };
  return (
    '<form class="score-row' +
    (done ? " done" : "") +
    '" data-form="quick" data-game-id="' +
    n +
    '" data-version="' +
    edition.version +
    '"><div class="sr-head"><span class="kicker">Jogo ' +
    num(n) +
    '</span><span class="sr-stage">' +
    stageName(n) +
    "</span>" +
    (done ? '<span class="chip ok">' + icon("check") + "Concluído</span>" : "") +
    '</div><div class="sr-body">' +
    side(0) +
    '<span class="sr-x">×</span>' +
    side(1) +
    '</div><div class="sr-actions">' +
    (done
      ? '<button type="button" class="btn ghost-danger" data-act="clearScore" data-game-num="' +
        n +
        '">' +
        icon("trash") +
        'Apagar</button><button class="btn primary">Salvar correção</button>'
      : '<input name="court" class="sr-court" maxlength="30" placeholder="Quadra" aria-label="Quadra do jogo ' +
        num(n) +
        '"><button type="button" class="btn" data-act="callRow">' +
        icon("megaphone") +
        'Chamar</button><button class="btn primary">Salvar placar</button>') +
    '</div><p class="error" role="alert"></p></form>'
  );
}
function scoresPanel() {
  const all = Object.values(games),
    ready = all.filter((g) => !g.score && g.teams.every(Boolean)),
    done = all.filter((g) => g.score).sort((a, b) => b.number - a.number),
    waiting = all.filter((g) => !g.score && !g.teams.every(Boolean));
  if (edition.archived)
    return '<p class="note">Edição encerrada: os placares estão bloqueados e preservados no histórico.</p>';
  return (
    '<div class="admin-summary"><span><b>' +
    ready.length +
    "</b> prontos para jogar</span><span><b>" +
    done.length +
    "</b> concluídos</span><span><b>" +
    waiting.length +
    '</b> aguardando</span></div><section class="admin-group"><h3>Prontos para jogar</h3><p class="help">Toque em <b>Chamar</b> para avisar as duplas no celular. Lance o placar assim que o jogo terminar: os próximos adversários são avisados sozinhos.</p><div class="score-list">' +
    (ready.map(scoreRow).join("") ||
      '<p class="box">Nenhum jogo pronto agora. Assim que um placar definir as duas duplas de um jogo, ele aparece aqui.</p>') +
    "</div></section>" +
    (done.length
      ? '<section class="admin-group"><h3>Concluídos</h3><p class="help">Para corrigir, troque os números e salve. Só é possível apagar um placar se os jogos seguintes ainda não tiverem resultado.</p><div class="score-list">' +
        done.map(scoreRow).join("") +
        "</div></section>"
      : "") +
    (waiting.length
      ? '<details class="admin-group waiting"><summary>Aguardando definição (' +
        waiting.length +
        ')</summary><div class="rows">' +
        waiting
          .map(
            (g) =>
              '<button class="row" data-game="' +
              g.number +
              '"><span class="kicker">Jogo ' +
              num(g.number) +
              '</span><span class="pair">' +
              esc(team(g.teams[0], g.refs[0])) +
              " × " +
              esc(team(g.teams[1], g.refs[1])) +
              "</span><em>" +
              stageName(g.number) +
              "</em></button>",
          )
          .join("") +
        "</div></details>"
      : "")
  );
}
function teamsPanel() {
  if (edition.archived)
    return '<p class="note">Edição encerrada: as duplas não podem mais ser alteradas.</p>';
  return (
    '<form data-form="teams" class="builder admin-teams" novalidate><p class="help">Edite atletas, apelido, cor e símbolo de cada dupla. A ordem das vagas fica fixa depois da criação (ela define os confrontos).</p><ol class="roster"></ol><div class="builder-foot page-foot"><span class="counter"><span><b>0</b>/18 duplas prontas</span><span class="meter"><b></b></span></span><p role="alert" class="error"></p><button type="button" class="btn" data-act="teamsReset">Desfazer</button><button class="btn primary">Salvar duplas</button></div></form>'
  );
}
function settingsPanel() {
  const left = 34 - count(),
    link = editionUrl(edition);
  const card = (title, body, cls = "") =>
    '<section class="admin-card ' + cls + '"><h3>' + title + "</h3>" + body + "</section>";
  return (
    '<div class="admin-grid">' +
    card(
      "Dados da edição",
      '<form data-form="settings" class="stack"><label>Nome do campeonato<input name="title" maxlength="70" required value="' +
        esc(edition.title) +
        '"></label><label class="checklabel"><input type="checkbox" name="visible"' +
        (edition.public ? " checked" : "") +
        '> Exibir esta edição na área pública</label><p class="help">Edições privadas só aparecem para os organizadores.</p><button class="btn primary">Salvar alterações</button><p class="error" role="alert"></p></form>',
    ) +
    card(
      "Foto de capa",
      '<div class="admin-cover" style="--cover:' +
        (coverUrl(edition.cover)
          ? 'url(&quot;' + encodeURI(coverUrl(edition.cover)) + '&quot;)'
          : "url(assets/hero.jpg)") +
        '"><span>' +
        esc(edition.title) +
        "</span></div>" +
        btn("coverEdit", icon("image") + "Trocar foto de capa"),
    ) +
    card(
      "Link para os atletas",
      '<p class="help">Mande no grupo do torneio. Quem abrir pode instalar o app e ativar os avisos da própria dupla. O link usa o nome do campeonato: se trocar o nome, mande o link novo.</p><input readonly class="admin-link" value="' +
        esc(link.href) +
        '" aria-label="Link da edição">' +
        btn("share", icon("share") + "Copiar link"),
    ) +
    (edition.is_owner
      ? card(
          "Organizadores",
          '<p class="help">Quem você adicionar pode lançar placares, chamar duplas e editar as suas edições. A conta precisa existir no Supabase.</p>' +
            btn("staff", icon("user") + "Adicionar organizador"),
        )
      : "") +
    card(
      "Encerrar edição",
      edition.archived
        ? '<p class="help">Edição encerrada. Os resultados ficam no histórico.</p>'
        : left
          ? '<p class="help">Disponível depois dos 34 jogos. Faltam <b>' +
            left +
            "</b>.</p>"
          : '<p class="help">Todos os jogos foram concluídos. Encerrar bloqueia alterações e mantém o histórico.</p>' +
            btn("archive", "Encerrar edição"),
      "muted-card",
    ) +
    card(
      "Conta",
      '<p class="help">' +
        esc(user?.email || "") +
        "</p>" +
        btn("new", icon("trophy") + "Criar outro campeonato") +
        btn("logout", "Sair da conta"),
      "muted-card",
    ) +
    "</div>"
  );
}
function adminPanel() {
  const tabs = [
    ["scores", "Placares", "game"],
    ["teams", "Duplas", "teams"],
    ["settings", "Edição", "settings"],
  ];
  return (
    '<div class="section-title"><div><h2>Painel do organizador</h2><p>' +
    esc(edition.title) +
    " · " +
    status() +
    " · " +
    count() +
    ' de 34 jogos</p></div></div><div class="admin-tabs" role="group" aria-label="Seções do painel">' +
    tabs
      .map(
        ([k, l, ic]) =>
          '<button class="' +
          (k === adminTab ? "active" : "") +
          '" data-admin-tab="' +
          k +
          '" aria-pressed="' +
          (k === adminTab) +
          '">' +
          icon(ic) +
          l +
          "</button>",
      )
      .join("") +
    "</div>" +
    (adminTab === "scores"
      ? scoresPanel()
      : adminTab === "teams"
        ? teamsPanel()
        : settingsPanel())
  );
}
function openPanel(tab) {
  if (!canAdmin()) return;
  view = "admin";
  if (tab) adminTab = tab;
  full = false;
  if (dialog.open) dialog.close();
  render();
  $(".viewtabs")?.scrollIntoView({ block: "start", behavior: "smooth" });
}

function renderSection() {
  let content = "";
  if (view === "bracket") {
    content =
      '<div class="section-title"><div><h2>Chave do campeonato</h2><p>Selecione uma partida para consultar placar, origem e destino das duplas.</p></div><div class="actionset"><button class="iconbtn" data-act="showList" aria-label="Ver lista de jogos">' +
      icon("list") +
      '</button><button class="iconbtn" data-act="expand" aria-label="Ampliar chave">' +
      icon("expand") +
      '</button></div></div><div class="board ' +
      (full ? "full" : "") +
      '"><div class="board-top"><div class="filters">' +
      Object.entries(branchNames)
        .map(
          ([key, label]) =>
            '<button class="' +
            (key === branch ? "active" : "") +
            '" data-branch="' +
            key +
            '">' +
            label +
            "</button>",
        )
        .join("") +
      "</div>" +
      '<div class="legend"><span><i class="dot"></i>Concluído</span><span><i class="dot blue"></i>Disponível</span><span><i class="dot gray"></i>A definir</span></div>' +
      (full
        ? '<button type="button" class="btn close-full" data-act="expand">' +
          icon("expand") +
          "Sair da tela cheia</button>"
        : "") +
      '</div><div class="canvas" tabindex="0" aria-label="Diagrama de confrontos. Arraste para navegar e use dois dedos para dar zoom."></div><div class="board-bottom"><span class="board-note">18 duplas · 34 jogos<span class="drag-hint"> · arraste para navegar</span><span class="rotate-hint">Use dois dedos para dar zoom</span></span><span class="zoom" role="group" aria-label="Zoom da chave"><button data-act="zoomOut" aria-label="Diminuir zoom">−</button><button class="zoom-val" data-act="zoomFit" title="Ajustar à tela" aria-label="Ajustar à tela">100%</button><button data-act="zoomIn" aria-label="Aumentar zoom">+</button>' +
      (full
        ? ""
        : '<button data-act="expand" class="zoom-full" aria-label="Tela cheia" title="Tela cheia">' +
          icon("expand") +
          "</button>") +
      "</span></div></div>";
  } else if (view === "admin") {
    content = adminPanel();
  } else if (view === "teams") {
    content =
      '<div class="section-title"><h2>Duplas inscritas</h2><span class="muted">18 duplas</span></div><div class="cards">' +
      edition.teams
        .map((name, i) => {
          const p = identity(i + 1),
            athletes = p.n && p.a && p.b ? p.a + " & " + p.b + " · " : "";
          return (
            '<div class="tile' +
            (i + 1 === mySlot ? " mine" : "") +
            '" style="--c:' +
            p.c +
            '">' +
            crest(i + 1) +
            '<div class="tile-text"><span class="tname">' +
            esc(name) +
            "</span><small>" +
            esc(athletes) +
            "Vaga " +
            num(i + 1) +
            "</small></div></div>"
          );
        })
        .join("") +
      "</div>";
  } else if (view === "matches") {
    const list = Object.values(games).filter(
      (g) =>
        filter === "all" ||
        (filter === "done"
          ? g.score
          : filter === "ready"
            ? !g.score && g.teams.every(Boolean)
            : !g.teams.every(Boolean)),
    );
    content =
      '<div class="section-title"><h2>Partidas</h2><select class="filter-select" aria-label="Filtrar partidas" style="width:auto" id="match-filter">' +
      [
        ["all", "Todos os jogos"],
        ["ready", "Disponíveis"],
        ["done", "Concluídos"],
        ["pending", "A definir"],
      ]
        .map(
          ([k, l]) =>
            '<option value="' +
            k +
            '" ' +
            (k === filter ? "selected" : "") +
            ">" +
            l +
            "</option>",
        )
        .join("") +
      '</select></div><div class="rows">' +
      (list
        .map(
          (g) =>
            '<button class="row" data-game="' +
            g.number +
            '"><span class="kicker">Jogo ' +
            num(g.number) +
            '</span><span class="pair">' +
            esc(team(g.teams[0], g.refs[0])) +
            " × " +
            esc(team(g.teams[1], g.refs[1])) +
            "</span><em>" +
            phaseState(g)[1] +
            '</em><b class="result">' +
            (g.score ? g.score.join(" : ") : "–") +
            "</b></button>",
        )
        .join("") || '<p class="box">Nenhum jogo neste filtro.</p>') +
      "</div>";
  } else {
    content =
      '<div class="section-title"><h2>Classificação</h2></div><div class="rows">' +
      [games[34].winner, games[34].loser, games[33].winner, games[33].loser]
        .map(
          (id, i) =>
            '<div class="row"><b class="kicker">' +
            (i + 1) +
            "º lugar</b>" +
            crest(id) +
            '<span class="pair">' +
            esc(id ? edition.teams[id - 1] : "A definir") +
            "</span><small>Jogo " +
            (i < 2 ? "34" : "33") +
            "</small></div>",
        )
        .join("") +
      "</div>";
  }
  $("#content").innerHTML = content;
  document.body.classList.toggle("lock", view === "bracket" && full);
  if (view === "admin") {
    if (adminTab === "teams" && !edition.archived) {
      const key = edition.id + ":" + edition.version;
      if (draftMode !== "edit" || draftFor !== key) {
        draft = draftFromEdition();
        draftMode = "edit";
        draftFor = key;
      }
      openPick = null;
      renderRoster();
    }
    if (adminTab === "scores") loadStats();
  }
  if (view === "bracket") {
    graph();
    // Reajusta depois que o layout assenta (troca de tela cheia, fontes, barra de rolagem).
    requestAnimationFrame(() => zoom === null && graph());
  }
}
function showGame(n) {
  const g = games[n],
    can = edition.can_edit && !edition.archived && g.teams.every(Boolean);
  const stage =
    n === 34
      ? "Final"
      : n === 33
        ? "Disputa de 3º lugar"
        : n === 31 || n === 32
          ? "Semifinal"
          : "Confronto";
  const paths = routes(n)
    .map((r) => r.outcome + " → jogo " + num(r.number))
    .join(" · ");
  const previous = Object.values(games).find(
    (other) =>
      other.number < n &&
      other.score &&
      g.teams.every((id) => id && other.teams.includes(id)),
  );
  modal(
    stage + " · Jogo " + num(n),
    '<div class="stack"><p class="muted">' +
      phaseState(g)[1] +
      (previous
        ? " · Estas duplas já se enfrentaram no jogo " + num(previous.number)
        : "") +
      '</p><form data-form="score" data-game-id="' +
      n +
      '" data-edition="' +
      edition.id +
      '" data-version="' +
      edition.version +
      '"><div class="scoregrid">' +
      g.teams
        .map(
          (id, i) =>
            "<label>" +
            crest(id) +
            esc(team(id, g.refs[i])) +
            (can
              ? '<input aria-label="Placar ' +
                (i + 1) +
                '" name="s' +
                i +
                '" type="number" required min="0" max="999" value="' +
                (g.score?.[i] ?? "") +
                '">'
              : '<b class="result">' + (g.score?.[i] ?? "–") + "</b>") +
            "</label>",
        )
        .join("") +
      "</div>" +
      (can ? '<button class="btn primary">Salvar placar</button>' : "") +
      "</form>" +
      (can && !g.score && edition.id !== "demo"
        ? '<form data-form="call" class="callbox" data-game-id="' +
          n +
          '"><div class="callbox-text"><strong>' +
          icon("megaphone") +
          'Chamar para a quadra</strong><span class="help">Envia um aviso para o celular das duas duplas.</span></div><div class="callbox-row"><input name="court" maxlength="30" placeholder="Quadra (opcional)" aria-label="Quadra"><button class="btn primary">Chamar duplas</button></div></form>'
        : "") +
      '<div class="box"><h3>Origem das vagas</h3><p class="help">' +
      g.refs.map(sourceLabel).join(" × ") +
      '</p></div><p class="help">' +
      (paths ||
        "Define o " +
          (n === 34 ? "campeão e o vice." : "terceiro e o quarto colocados.")) +
      "</p></div>",
  );
}
function showEditions() {
  modal(
    "Campeonatos",
    '<div class="stack">' +
      [...editions, demo]
        .map(
          (e) =>
            '<button class="row" data-edition-id="' +
            esc(e.id) +
            '"><span>' +
            esc(e.title) +
            "<small>" +
            (e.id === "demo"
              ? "Demonstração"
              : e.archived
                ? "Encerrado"
                : e.public
                  ? "Público"
                  : "Privado") +
            "</small></span>" +
            icon("right") +
            "</button>",
        )
        .join("") +
      btn(user ? "new" : "login", "Criar campeonato", true) +
      "</div>",
  );
}
function showRules() {
  modal(
    "Regulamento da chave",
    '<div class="stack"><div class="box"><h3>18 duplas · 34 jogos</h3><p class="help">As vagas 1 a 16 entram nos jogos 1 a 8. As vagas 17 e 18 entram diretamente nos jogos 9 e 10.</p></div><div><h3>Repescagem</h3><p class="help">Os caminhos são fixos. O perdedor do jogo 25 segue para o jogo 30. O perdedor do jogo 26 segue para o jogo 29. Reencontros podem ocorrer.</p></div><div><h3>Decisões</h3><p class="help">Os vencedores das semifinais 31 e 32 disputam o título no jogo 34. Os perdedores disputam o 3º lugar no jogo 33.</p></div><p class="help">Esta versão registra placares inteiros com um vencedor definido. Sets, pontuação-alvo, desempates e W.O. dependem do regulamento da organização.</p></div>',
  );
}
function auth(mode = "login") {
  const titles = {
    login: "Entrar na organização",
    recover: "Recuperar senha",
    newpass: "Definir nova senha",
  };
  modal(
    titles[mode],
    '<form data-form="' +
      mode +
      '">' +
      (mode === "newpass"
        ? ""
        : '<label>E-mail<input name="email" type="email" autocomplete="email" required></label>') +
      (mode === "recover"
        ? ""
        : '<label>Senha<input name="password" type="password" minlength="6" autocomplete="' +
          (mode === "login" ? "current-password" : "new-password") +
          '" required></label>') +
      '<button class="btn primary">' +
      {
        login: "Entrar",
        recover: "Enviar link de recuperação",
        newpass: "Salvar senha",
      }[mode] +
      '</button></form><div class="dialog-actions" style="margin-top:15px">' +
      (mode === "login"
        ? btn("recover", "Esqueci a senha")
        : mode === "newpass"
          ? ""
          : btn("login", "Voltar ao login")) +
      "</div>" +
      (mode === "login"
        ? '<p class="help" style="margin-top:14px">Acesso restrito à organização. As contas são criadas pela administração.</p>'
        : ""),
  );
}
function manage() {
  if (!user) {
    auth();
    return;
  }
  modal(
    "Área do organizador",
    '<div class="stack"><p class="muted">Conectado como ' +
      esc(user.email) +
      "</p>" +
      (canAdmin()
        ? '<button type="button" class="btn primary" data-act="openPanel">' +
          icon("settings") +
          "Painel de “" +
          esc(edition.title) +
          "”</button>" +
          '<p class="help">Placares, chamada das duplas, nomes e cores das duplas, capa e configurações.</p>'
        : '<p class="note">Você não organiza a edição aberta. Troque para uma das suas ou crie uma nova.</p>') +
      btn("new", "Criar campeonato", !canAdmin()) +
      btn("editions", "Trocar de edição") +
      btn("logout", "Sair da conta") +
      "</div>",
  );
}
function newEdition() {
  if (!user) {
    auth();
    return;
  }
  if (!draft || draftMode !== "new") {
    draft = loadDraft();
    draftMode = "new";
  }
  openPick = null;
  modal(
    "Nova edição",
    '<form data-form="new" class="builder" novalidate>' +
      coverField(draft.title) +
      '<label>Nome do campeonato<input required name="title" maxlength="70" placeholder="Ex.: Copa Verão RB6" value="' +
      esc(draft.title) +
      '"></label>' +
      '<label class="checklabel"><input type="checkbox" name="visible"' +
      (draft.visible ? " checked" : "") +
      "> Exibir esta edição na área pública</label>" +
      '<div class="builder-head"><div><h3>Duplas</h3><p class="help">A ordem define a vaga. As vagas 17 e 18 entram direto nos jogos 9 e 10. Toque no escudo para escolher cor e símbolo.</p></div>' +
      '<button type="button" class="btn" data-act="pasteToggle">' +
      icon("paste") +
      "Colar lista</button></div>" +
      '<div class="paste" hidden><label>Uma dupla por linha (ex.: “Ana e Bia”)<textarea id="paste-text" rows="6" placeholder="Ana e Bia&#10;Caio e Vini"></textarea></label><button type="button" class="btn" data-act="pasteApply">Preencher vagas</button></div>' +
      '<ol class="roster"></ol>' +
      '<div class="builder-foot"><span class="counter"><span><b>0</b>/18 duplas prontas</span><span class="meter"><b></b></span></span><p role="alert" class="error"></p><button class="btn primary">Criar edição</button></div>' +
      "</form>",
    true,
  );
  renderRoster();
  showCoverPreview();
}

/* ---------- Construtor de duplas ---------- */
const DRAFT_KEY = "arena-areia:rascunho";
let draft = null,
  draftMode = null, // "new" (criar edição) ou "edit" (painel → duplas)
  draftFor = "",
  openPick = null,
  coverBlob = null,
  coverPreview = "";
function blankSlot(i) {
  return { a: "", b: "", n: "", ...defaultIdentity(i) };
}
function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (d && Array.isArray(d.slots) && d.slots.length === 18)
      return {
        title: String(d.title || ""),
        visible: d.visible !== false,
        slots: d.slots.map((s, i) => ({
          a: String(s.a || ""),
          b: String(s.b || ""),
          n: String(s.n || ""),
          c: isColor(s.c) ? s.c : defaultIdentity(i).c,
          i: isGlyph(s.i) ? s.i : defaultIdentity(i).i,
        })),
      };
  } catch {}
  return {
    title: "",
    visible: true,
    slots: Array.from({ length: 18 }, (_, i) => blankSlot(i)),
  };
}
function saveDraft() {
  if (draftMode !== "new") return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {}
}
function clearDraft() {
  draft = null;
  draftMode = null;
  setCover(null);
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}
const teamName = (s) =>
  s.n.trim() || [s.a.trim(), s.b.trim()].filter(Boolean).join(" e ");
const slotReady = (s) =>
  Boolean(
    (s.a.trim() && s.b.trim()) || (draftMode === "edit" && s.n.trim()),
  );
// O construtor de duplas vive no diálogo (nova edição) ou na página (painel).
const rosterRoot = () =>
  dialog.open && dialogBody.querySelector(".roster")
    ? dialogBody
    : $("#content");
function slotCard(s, i) {
  const name = teamName(s),
    open = openPick === i;
  return (
    '<li class="slot' +
    (slotReady(s) ? " done" : "") +
    (open ? " picking" : "") +
    '" data-slot-card="' +
    i +
    '" style="--c:' +
    s.c +
    '"><div class="slot-head"><button type="button" class="idbtn" data-pick="' +
    i +
    '" aria-expanded="' +
    open +
    '" aria-label="Cor e símbolo da vaga ' +
    num(i + 1) +
    '">' +
    glyph(s.i) +
    '</button><div class="slot-title"><small>Vaga ' +
    num(i + 1) +
    '</small><strong class="slot-name">' +
    (name ? esc(name) : "Dupla " + num(i + 1)) +
    '</strong></div><span class="ready">' +
    icon("check") +
    "Pronta</span></div>" +
    (open
      ? '<div class="picker"><div class="swatches" role="group" aria-label="Cor">' +
        palette
          .map(
            ([c, label]) =>
              '<button type="button" class="swatch' +
              (c === s.c ? " on" : "") +
              '" data-color="' +
              c +
              '" style="--sw:' +
              c +
              '" aria-pressed="' +
              (c === s.c) +
              '" aria-label="' +
              label +
              '" title="' +
              label +
              '"></button>',
          )
          .join("") +
        '</div><div class="glyphs" role="group" aria-label="Símbolo">' +
        glyphNames
          .map(
            (g) =>
              '<button type="button" class="glyph' +
              (g === s.i ? " on" : "") +
              '" data-glyph="' +
              g +
              '" aria-pressed="' +
              (g === s.i) +
              '" aria-label="' +
              glyphLabel(g) +
              '" title="' +
              glyphLabel(g) +
              '">' +
              glyph(g) +
              "</button>",
          )
          .join("") +
        "</div></div>"
      : "") +
    '<div class="slot-fields"><input data-slot="' +
    i +
    '" data-f="a" maxlength="30" autocomplete="off" placeholder="Atleta 1" aria-label="Vaga ' +
    num(i + 1) +
    ', atleta 1" value="' +
    esc(s.a) +
    '"><span class="amp" aria-hidden="true">&amp;</span><input data-slot="' +
    i +
    '" data-f="b" maxlength="30" autocomplete="off" placeholder="Atleta 2" aria-label="Vaga ' +
    num(i + 1) +
    ', atleta 2" value="' +
    esc(s.b) +
    '"></div><input class="nick" data-slot="' +
    i +
    '" data-f="n" maxlength="30" autocomplete="off" placeholder="Apelido da dupla (opcional)" aria-label="Vaga ' +
    num(i + 1) +
    ', apelido" value="' +
    esc(s.n) +
    '"></li>'
  );
}
function renderRoster(focus) {
  const roster = rosterRoot().querySelector(".roster");
  if (!roster || !draft) return;
  roster.innerHTML = draft.slots.map(slotCard).join("");
  updateCounter();
  if (focus) roster.querySelector(focus)?.focus();
}
function updateCounter() {
  const ready = draft.slots.filter(slotReady).length,
    counter = rosterRoot().querySelector(".counter");
  if (!counter) return;
  counter.querySelector("b").textContent = ready;
  counter.querySelector(".meter b").style.width = (ready / 18) * 100 + "%";
  counter.classList.toggle("full", ready === 18);
}
/** Valida as 18 vagas do construtor e devolve nomes + identidades (marca as vagas com erro). */
function collectDraft(f) {
  const teams = draft.slots.map(teamName),
    seen = new Map(),
    bad = new Set();
  draft.slots.forEach((s, i) => {
    if (!slotReady(s) || teams[i].length > 45) bad.add(i);
    const key = teams[i].toLowerCase();
    if (key && seen.has(key)) bad.add(i).add(seen.get(key));
    seen.set(key, i);
  });
  f.querySelectorAll(".slot").forEach((card, i) =>
    card.classList.toggle("bad", bad.has(i)),
  );
  if (bad.size) {
    f.querySelector(".slot.bad")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    throw Error(
      draftMode === "edit"
        ? "Confira as vagas destacadas: cada dupla precisa dos dois atletas (ou de um apelido) e de um nome diferente das demais."
        : "Confira as vagas destacadas: cada dupla precisa dos dois atletas e de um nome diferente das demais.",
    );
  }
  return {
    teams,
    profiles: draft.slots.map((s) => ({
      a: s.a.trim(),
      b: s.b.trim(),
      n: s.n.trim(),
      c: s.c,
      i: s.i,
    })),
  };
}
function parseTeams(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 18)
    .map((line) => {
      const [a, ...rest] = line.split(/\s+e\s+|\s*[&\/+,;]\s*/i);
      return { a: (a || "").slice(0, 30), b: rest.join(" ").slice(0, 30) };
    });
}

/* ---------- Foto de capa ---------- */
function coverField(title) {
  return (
    '<div class="cover-field"><div class="cover-preview"><div class="cover-copy"><span class="eyebrow">' +
    icon("ball") +
    " Capa da edição</span><strong>" +
    esc(title || "Seu campeonato") +
    '</strong></div></div><div class="cover-actions"><label class="btn cover-pick">' +
    icon("image") +
    '<span>Escolher foto de capa</span><input type="file" accept="image/*" id="cover-file" hidden></label><button type="button" class="btn" data-act="coverClear" hidden>' +
    icon("trash") +
    'Remover</button><span class="help">JPG ou PNG na horizontal ficam melhor. A foto é otimizada antes do envio.</span></div></div>'
  );
}
function setCover(blob) {
  if (coverPreview) URL.revokeObjectURL(coverPreview);
  coverBlob = blob;
  coverPreview = blob ? URL.createObjectURL(blob) : "";
}
function showCoverPreview(fallback = "") {
  const box = dialogBody.querySelector(".cover-preview");
  if (!box) return;
  const src = coverPreview || fallback;
  box.style.setProperty("--cover", src ? 'url("' + src + '")' : "");
  box.classList.toggle("has-photo", Boolean(src));
  const clear = dialogBody.querySelector('[data-act="coverClear"]');
  if (clear) clear.hidden = !coverPreview;
}
async function shrinkImage(file) {
  if (!file.type.startsWith("image/"))
    throw Error("Escolha um arquivo de imagem.");
  if (file.size > 25 * 1024 * 1024)
    throw Error("A foto é muito grande (máximo de 25 MB).");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.84));
  if (!blob) throw Error("Não foi possível ler esta foto.");
  return blob;
}
async function uploadCover(blob) {
  const { data } = await client.auth.getUser();
  if (!data?.user) throw Error("Entre novamente para enviar a foto.");
  const path = data.user.id + "/" + crypto.randomUUID() + ".jpg";
  const { error } = await client.storage
    .from(COVERS)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error)
    throw Error(
      "Não foi possível enviar a foto: " +
        error.message +
        (/bucket/i.test(error.message)
          ? " (aplique a migração 202611050003 no Supabase)."
          : ""),
    );
  return path;
}
function coverEditor() {
  setCover(null);
  modal(
    "Foto de capa",
    '<form data-form="cover" class="stack">' +
      coverField(edition.title) +
      '<button class="btn primary">Salvar capa</button>' +
      (edition.cover
        ? '<button type="button" class="btn" data-act="coverReset">Voltar para a capa padrão</button>'
        : "") +
      "</form>",
  );
  showCoverPreview(coverUrl(edition.cover));
}
async function share() {
  const url = editionUrl(edition);
  try {
    await navigator.clipboard.writeText(url.href);
    notify("Link da edição copiado");
  } catch {
    modal(
      "Compartilhar edição",
      '<label>Link da edição<input readonly value="' +
        esc(url.href) +
        '"></label>',
    );
    dialogBody.querySelector("input").select();
  }
}
document.addEventListener("click", async (ev) => {
  const b = ev.target.closest("button");
  if (!b) return;
  if (b.dataset.view) {
    view = b.dataset.view;
    full = false;
    render();
    return;
  }
  if (b.dataset.branch) {
    branch = b.dataset.branch;
    zoom = null;
    renderSection();
    return;
  }
  if (b.dataset.game) {
    showGame(+b.dataset.game);
    return;
  }
  if (b.dataset.editionId) {
    setEdition(editions.find((e) => e.id === b.dataset.editionId) || demo);
    dialog.close();
    return;
  }
  if (b.dataset.pick && draft) {
    const i = +b.dataset.pick;
    openPick = openPick === i ? null : i;
    renderRoster('[data-pick="' + i + '"]');
    return;
  }
  if ((b.dataset.color || b.dataset.glyph) && draft) {
    const i = +b.closest("[data-slot-card]").dataset.slotCard,
      key = b.dataset.color ? "color" : "glyph",
      value = b.dataset[key];
    if (key === "color" && isColor(value)) draft.slots[i].c = value;
    if (key === "glyph" && isGlyph(value)) draft.slots[i].i = value;
    saveDraft();
    renderRoster(
      '[data-slot-card="' + i + '"] [data-' + key + '="' + value + '"]',
    );
    return;
  }
  // Avisos: precisam rodar direto no toque (o iPhone exige isso para pedir permissão).
  if (b.dataset.followSlot) {
    startFollow(+b.dataset.followSlot);
    return;
  }
  const a = b.dataset.act;
  if (b.dataset.adminTab) {
    adminTab = b.dataset.adminTab;
    if (adminTab === "teams") draftFor = ""; // recarrega as duplas da edição
    renderSection();
    return;
  }
  if (a === "openPanel") return openPanel();
  if (a === "teamsReset") {
    draftFor = "";
    renderSection();
    notify("Alterações desfeitas");
    return;
  }
  if (a === "clearScore") {
    const n = +b.dataset.gameNum,
      g = games[n];
    modal(
      "Apagar placar · Jogo " + num(n),
      '<form data-form="clear" data-game-id="' +
        n +
        '" class="stack"><p class="help">O placar <b>' +
        g.score.join(" × ") +
        "</b> de " +
        esc(team(g.teams[0], g.refs[0])) +
        " × " +
        esc(team(g.teams[1], g.refs[1])) +
        ' será removido e o jogo volta para “prontos para jogar”.</p><button class="btn primary">Apagar placar</button></form>',
    );
    return;
  }
  if (a === "callRow") {
    const f = b.closest("form"),
      err = f.querySelector(".error");
    b.disabled = true;
    err.textContent = "";
    notifyGames(edition.id, "call", [+f.dataset.gameId], f.court.value)
      .then((r) =>
        notify(
          r.sent
            ? "Chamado enviado para " + r.sent + " celular(es)"
            : "Nenhum celular dessas duplas está com avisos ligados",
        ),
      )
      .catch((e) => (err.textContent = e.message))
      .finally(() => (b.disabled = false));
    return;
  }
  if (a === "followOpen") return chooseTeam();
  if (a === "iosHelp") return iosHelp();
  if (a === "pushOn" && mySlot) {
    if (isIOS && !isStandalone()) return iosHelp();
    startFollow(mySlot);
    return;
  }
  if (a === "install") {
    promptInstall().then((ok) => ok && notify("App instalado"));
    return;
  }
  if (a === "unfollow") {
    unfollow().finally(() => {
      render();
      notify("Você parou de seguir a dupla");
    });
    return;
  }
  if (a === "pasteToggle") {
    const box = dialogBody.querySelector(".paste");
    box.hidden = !box.hidden;
    if (!box.hidden) box.querySelector("textarea").focus();
    return;
  }
  if (a === "pasteApply" && draft) {
    const rows = parseTeams(dialogBody.querySelector("#paste-text").value);
    rows.forEach((r, i) => Object.assign(draft.slots[i], r));
    saveDraft();
    dialogBody.querySelector(".paste").hidden = true;
    renderRoster();
    notify(rows.length + " duplas preenchidas");
    return;
  }
  if (a === "coverClear") {
    setCover(null);
    const file = dialogBody.querySelector("#cover-file");
    if (file) file.value = "";
    showCoverPreview(
      dialogBody.querySelector('form[data-form="cover"]')
        ? coverUrl(edition.cover)
        : "",
    );
    return;
  }
  try {
    if (a === "close") dialog.close();
    if (a === "share") await share();
    if (a === "editions") showEditions();
    if (a === "rules") showRules();
    if (a === "manage") manage();
    if (a === "new") newEdition();
    if (a === "coverEdit") coverEditor();
    if (a === "coverReset") {
      await rpc("cover", { p_id: edition.id, p_cover: null });
      dialog.close();
      await refresh();
      notify("Capa padrão restaurada");
    }
    if (["login", "recover"].includes(a)) auth(a);
    if (a === "expand") {
      full = !full;
      zoom = null;
      renderSection();
      if (!full) $(".board")?.scrollIntoView({ block: "nearest" });
    }
    if (a === "zoomIn" || a === "zoomOut") {
      const c = $(".canvas"),
        prev = lastScale,
        next = Math.max(
          MIN_Z,
          Math.min(MAX_Z, +(prev * (a === "zoomIn" ? 1.2 : 1 / 1.2)).toFixed(3)),
        ),
        cx = (c.scrollLeft + c.clientWidth / 2) / prev,
        cy = (c.scrollTop + c.clientHeight / 2) / prev;
      zoom = next;
      graph();
      c.scrollLeft = cx * next - c.clientWidth / 2;
      c.scrollTop = cy * next - c.clientHeight / 2;
    }
    if (a === "zoomFit") {
      zoom = null;
      graph();
    }
    if (a === "showList") {
      view = "matches";
      render();
    }
    if (a === "logout") {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      dialog.close();
      await refresh();
      notify("Você saiu da conta");
    }
    if (a === "staff")
      modal(
        "Adicionar organizador",
        '<form data-form="staff"><p class="help">Essa conta poderá registrar resultados e encerrar todas as suas edições. O e-mail precisa estar confirmado.</p><label>E-mail do organizador<input type="email" name="email" required></label><button class="btn primary">Adicionar</button></form>',
      );
    if (a === "archive")
      modal(
        "Encerrar edição",
        '<form data-form="archive"><p class="help">Os 34 resultados serão preservados no histórico e a edição será fechada para alterações.</p><button class="btn primary">Confirmar encerramento</button></form>',
      );
  } catch (e) {
    notify(e.message);
  }
});
document.addEventListener("change", async (ev) => {
  const t = ev.target;
  if (t.id === "match-filter") {
    filter = t.value;
    renderSection();
  }
  if (t.name === "visible" && draft && t.closest(".builder")) {
    draft.visible = t.checked;
    saveDraft();
  }
  if (t.id === "cover-file" && t.files[0]) {
    const err = dialogBody.querySelector(".error");
    try {
      setCover(await shrinkImage(t.files[0]));
      showCoverPreview();
      if (err) err.textContent = "";
    } catch (e) {
      t.value = "";
      if (err) err.textContent = e.message;
    }
  }
});
document.addEventListener("input", (ev) => {
  const t = ev.target;
  if (!draft || !t.closest(".builder")) return;
  if (t.name === "title") {
    draft.title = t.value;
    const label = dialogBody.querySelector(".cover-copy strong");
    if (label) label.textContent = t.value || "Seu campeonato";
  } else if (t.dataset.f) {
    const i = +t.dataset.slot,
      s = draft.slots[i];
    s[t.dataset.f] = t.value;
    const card = t.closest(".slot");
    card.classList.toggle("done", slotReady(s));
    card.classList.remove("bad");
    card.querySelector(".slot-name").textContent =
      teamName(s) || "Dupla " + num(i + 1);
    updateCounter();
  } else return;
  saveDraft();
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && !dialog.open && full) {
    full = false;
    zoom = null;
    renderSection();
  }
});
/* Arrastar a chave com o mouse para navegar (no toque, a rolagem nativa já faz isso; dois dedos dão zoom). */
let pan = null;
document.addEventListener("pointerdown", (ev) => {
  const c = ev.target.closest?.(".canvas");
  if (!c || ev.pointerType !== "mouse" || ev.button !== 0) return;
  if (ev.target.closest(".match")) return;
  pan = {
    c,
    x: ev.clientX,
    y: ev.clientY,
    l: c.scrollLeft,
    t: c.scrollTop,
  };
  c.classList.add("dragging");
});
document.addEventListener("pointermove", (ev) => {
  if (!pan) return;
  pan.c.scrollLeft = pan.l - (ev.clientX - pan.x);
  pan.c.scrollTop = pan.t - (ev.clientY - pan.y);
});
document.addEventListener("pointerup", () => {
  pan?.c.classList.remove("dragging");
  pan = null;
});
/* Pinça com dois dedos na chave (celular): escala ao vivo, mantendo o ponto entre os dedos. */
let pinch = null;
function applyScale(c, s) {
  const wrap = c.querySelector(".graph-wrap"),
    g = c.querySelector(".graph");
  if (!wrap || !g) return;
  const w = parseFloat(g.style.width),
    h = parseFloat(g.style.height);
  wrap.style.width = Math.ceil(w * s) + "px";
  wrap.style.height = Math.ceil(h * s) + "px";
  g.style.transform = "scale(" + s + ")";
  c.classList.toggle("fits", s * w <= c.clientWidth + 1);
  const val = $(".zoom-val");
  if (val) val.textContent = Math.round(s * 100) + "%";
}
const fingers = (t) => ({
  x: (t[0].clientX + t[1].clientX) / 2,
  y: (t[0].clientY + t[1].clientY) / 2,
  d: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1,
});
document.addEventListener(
  "touchstart",
  (ev) => {
    const c = ev.target.closest?.(".canvas");
    if (!c || ev.touches.length !== 2) return;
    const wrap = c.querySelector(".graph-wrap");
    if (!wrap) return;
    ev.preventDefault();
    const f = fingers(ev.touches),
      r = wrap.getBoundingClientRect();
    pinch = {
      c,
      s0: lastScale,
      d0: f.d,
      px: (f.x - r.left) / lastScale,
      py: (f.y - r.top) / lastScale,
      s: lastScale,
    };
  },
  { passive: false },
);
document.addEventListener(
  "touchmove",
  (ev) => {
    if (!pinch || ev.touches.length !== 2) return;
    ev.preventDefault();
    const f = fingers(ev.touches),
      s = Math.max(MIN_Z, Math.min(MAX_Z, (pinch.s0 * f.d) / pinch.d0)),
      { c } = pinch;
    applyScale(c, s);
    pinch.s = s;
    const r = c.querySelector(".graph-wrap").getBoundingClientRect();
    c.scrollLeft += r.left + pinch.px * s - f.x;
    c.scrollTop += r.top + pinch.py * s - f.y;
  },
  { passive: false },
);
const endPinch = (ev) => {
  if (!pinch || ev.touches.length >= 2) return;
  zoom = lastScale = +pinch.s.toFixed(3);
  pinch = null;
};
document.addEventListener("touchend", endPinch);
document.addEventListener("touchcancel", endPinch);
// Safari (iPhone): não deixa a página inteira dar zoom quando a pinça é na chave.
document.addEventListener("gesturestart", (ev) => {
  if (ev.target.closest?.(".canvas")) ev.preventDefault();
});
// Se o diálogo de "nova edição" trocou o rascunho, o painel de duplas recarrega o da edição.
dialog.addEventListener("close", () => {
  if (view === "admin" && adminTab === "teams" && draftMode !== "edit")
    renderSection();
});
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  }
});
document.addEventListener("submit", async (ev) => {
  const f = ev.target.closest("form[data-form]");
  if (!f) return;
  ev.preventDefault();
  const data = new FormData(f),
    mode = f.dataset.form,
    email = data.get("email"),
    password = data.get("password"),
    submit = f.querySelector("button.primary") || f.querySelector("button");
  const label = submit.textContent;
  let note = "",
    custom = "";
  submit.disabled = true;
  const redirect = new URL(location.pathname, location.origin).href;
  try {
    if (["login", "recover", "newpass"].includes(mode)) {
      let result;
      if (mode === "login")
        result = await client.auth.signInWithPassword({ email, password });
      if (mode === "recover")
        result = await client.auth.resetPasswordForEmail(email, {
          redirectTo: redirect,
        });
      if (mode === "newpass")
        result = await client.auth.updateUser({ password });
      if (result.error) throw result.error;
      if (mode === "recover") {
        modal(
          "Confira seu e-mail",
          '<p class="help">Use o link enviado pelo Supabase para continuar.</p>',
        );
        return;
      }
      user = result.data.user ?? user;
      await refresh();
      if (canAdmin() && mode === "login") openPanel("scores");
      else manage();
      return;
    }
    if (mode === "new") {
      const title = String(data.get("title") || "").trim();
      if (!title) {
        f.querySelector('[name="title"]').focus();
        throw Error("Dê um nome ao campeonato.");
      }
      const { teams, profiles } = collectDraft(f),
        base = { p_title: title, p_teams: teams, p_public: data.has("visible") };
      submit.textContent = coverBlob ? "Enviando foto…" : "Criando…";
      const cover = coverBlob ? await uploadCover(coverBlob) : null;
      submit.textContent = "Criando…";
      let id;
      try {
        id = await rpc("create", {
          ...base,
          p_profiles: profiles,
          p_cover: cover,
        });
      } catch (e) {
        if (!/could not find the function/i.test(e.message)) throw e;
        id = await rpc("create", base);
        note =
          " (sem identidades/capa: aplique a migração 202611050003 no Supabase)";
      }
      clearDraft();
      const u = new URL(location.href);
      u.search = "";
      u.searchParams.set("edicao", id);
      history.pushState({}, "", u);
    }
    if (mode === "teams") {
      const { teams, profiles } = collectDraft(f);
      await rpc("update_teams", {
        p_id: edition.id,
        p_version: edition.version,
        p_teams: teams,
        p_profiles: profiles,
      });
      draftFor = "";
      custom = "Duplas atualizadas";
    }
    if (mode === "settings") {
      const title = String(data.get("title") || "").trim();
      if (!title) throw Error("Dê um nome ao campeonato.");
      await rpc("update", {
        p_id: edition.id,
        p_version: edition.version,
        p_title: title,
        p_public: data.has("visible"),
      });
      custom = "Edição atualizada";
    }
    if (mode === "clear") {
      await rpc("clear", {
        p_id: edition.id,
        p_version: edition.version,
        p_game: +f.dataset.gameId,
      });
      custom = "Placar apagado";
    }
    if (mode === "score" || mode === "quick") {
      const n = +f.dataset.gameId,
        score = [Number(data.get("s0")), Number(data.get("s1"))];
      if (data.get("s0") === "" || data.get("s1") === "")
        throw Error("Preencha os dois placares.");
      if (score[0] === score[1]) throw Error("Não pode haver empate.");
      await rpc("score", {
        p_id: f.dataset.edition || edition.id,
        p_version: +f.dataset.version,
        p_game: n,
        p_a: score[0],
        p_b: score[1],
      });
      // Jogos que passaram a ter as duas duplas definidas: avisa os celulares.
      const ready = (gs) =>
        new Set(
          Object.values(gs)
            .filter((g) => !g.score && g.teams.every(Boolean))
            .map((g) => g.number),
        );
      const before = ready(games),
        after = ready(
          resolveEdition({ ...edition, results: { ...edition.results, [n]: score } }),
        ),
        fresh = [...after].filter((x) => !before.has(x));
      if (fresh.length)
        notifyGames(edition.id, "next", fresh)
          .then((r) => r.sent && notify("Próximo jogo avisado em " + r.sent + " celular(es)"))
          .catch(() => {});
    }
    if (mode === "call") {
      submit.textContent = "Enviando…";
      const r = await notifyGames(
        edition.id,
        "call",
        [+f.dataset.gameId],
        String(data.get("court") || ""),
      );
      custom = r.sent
        ? "Chamado enviado para " + r.sent + " celular(es)"
        : "Nenhum celular dessas duplas está com avisos ligados";
    }
    if (mode === "cover") {
      if (!coverBlob) throw Error("Escolha uma foto primeiro.");
      submit.textContent = "Enviando foto…";
      const path = await uploadCover(coverBlob);
      await rpc("cover", { p_id: edition.id, p_cover: path });
      setCover(null);
    }
    if (mode === "staff")
      await rpc("staff", { p_id: edition.id, p_email: email });
    if (mode === "archive")
      await rpc("close", { p_id: edition.id, p_version: edition.version });
    dialog.close();
    await refresh();
    notify(
      custom ||
      (mode === "new"
        ? "Campeonato criado"
        : mode === "score" || mode === "quick"
          ? "Placar salvo"
          : mode === "staff"
            ? "Organizador adicionado"
            : mode === "cover"
              ? "Capa atualizada"
              : "Edição encerrada") + note,
    );
  } catch (err) {
    const el = f.querySelector(".error") || dialogBody.querySelector(".error");
    if (el) el.textContent = err.message;
    if (mode === "score" || /outro organizador/i.test(err.message))
      await refresh();
  } finally {
    submit.disabled = false;
    submit.textContent = label;
  }
});
client.auth.onAuthStateChange((event, session) => {
  user = session?.user ?? null;
  if (event === "PASSWORD_RECOVERY") {
    auth("newpass");
  }
  setTimeout(refresh, 0);
});
window.addEventListener("popstate", refresh);
window.addEventListener("resize", () => {
  if (view === "bracket") graph();
});
registerWorker();
icons();
render();
refresh();
setInterval(() => {
  if (!document.hidden) refresh();
}, 15000);

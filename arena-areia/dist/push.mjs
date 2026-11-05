// Avisos no celular. O aparelho segue uma dupla; nada de nome, e-mail ou telefone.
import { client, rpc, SUPABASE_URL, SUPABASE_KEY } from "./cloud.js";

const ME_KEY = "arena-areia:minha-dupla";
// Endereço (slug) da Edge Function no Supabase. O nome exibido no painel é arena-push.
const FN = SUPABASE_URL + "/functions/v1/super-responder";

export const ua = navigator.userAgent;
export const isIOS =
  /iphone|ipad|ipod/i.test(ua) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  matchMedia("(display-mode: standalone)").matches ||
  navigator.standalone === true;
export const pushSupported = () =>
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;
export const permission = () =>
  "Notification" in window ? Notification.permission : "unsupported";

/* ---------- "Minha dupla" (fica só neste aparelho) ---------- */
export function myTeam(editionId) {
  try {
    const me = JSON.parse(localStorage.getItem(ME_KEY) || "null");
    if (me && me.edition === editionId && me.slot >= 1 && me.slot <= 18)
      return me;
  } catch {}
  return null;
}
function saveMe(me) {
  try {
    if (me) localStorage.setItem(ME_KEY, JSON.stringify(me));
    else localStorage.removeItem(ME_KEY);
  } catch {}
}

/* ---------- Service worker ---------- */
export function registerWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

/* ---------- Instalar o app ---------- */
let installEvent = null;
const installListeners = new Set();
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvent = e;
  installListeners.forEach((fn) => fn());
});
window.addEventListener("appinstalled", () => {
  installEvent = null;
  installListeners.forEach((fn) => fn());
});
export const canPromptInstall = () => Boolean(installEvent);
export const onInstallChange = (fn) => installListeners.add(fn);
export async function promptInstall() {
  if (!installEvent) return false;
  installEvent.prompt();
  const { outcome } = await installEvent.userChoice;
  installEvent = null;
  installListeners.forEach((fn) => fn());
  return outcome === "accepted";
}

/* ---------- Inscrição de push ---------- */
const b64ToBytes = (s) => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
async function callFunction(method, body) {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  let res;
  try {
    res = await fetch(FN, {
      method,
      headers: {
        apikey: SUPABASE_KEY,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Error("Sem conexão com o serviço de avisos.");
  }
  const out = await res.json().catch(() => ({}));
  if (!res.ok)
    throw Error(
      out.error ||
        (res.status === 404
          ? "Serviço de avisos ainda não publicado no Supabase."
          : "Falha no serviço de avisos (" + res.status + ")."),
    );
  return out;
}

/** Segue a dupla neste aparelho. Com `withPush`, pede permissão e inscreve o celular.
 *  Chame a partir de um toque do usuário (exigência do iPhone para pedir permissão). */
export async function follow(editionId, slot, withPush) {
  if (!withPush) {
    saveMe({ edition: editionId, slot, push: false });
    return { push: false };
  }
  if (!pushSupported())
    throw Error(
      isIOS && !isStandalone()
        ? "No iPhone, instale o app na tela inicial primeiro."
        : "Este navegador não recebe avisos.",
    );
  // Pede a permissão ANTES de qualquer espera de rede (Safari exige o toque "fresco").
  const asked = Notification.requestPermission();
  const registration = navigator.serviceWorker.register("./sw.js");
  if ((await asked) !== "granted") {
    saveMe({ edition: editionId, slot, push: false });
    throw Error(
      "Os avisos foram bloqueados. Libere as notificações deste site nas configurações do celular.",
    );
  }
  await registration;
  const ready = await navigator.serviceWorker.ready;
  const { publicKey } = await callFunction("GET");
  let sub = await ready.pushManager.getSubscription();
  if (sub) {
    // Chave diferente (servidor trocou as chaves): refaz a inscrição.
    const current = sub.options?.applicationServerKey;
    const same =
      current &&
      btoa(String.fromCharCode(...new Uint8Array(current))) ===
        btoa(String.fromCharCode(...b64ToBytes(publicKey)));
    if (!same) {
      await sub.unsubscribe().catch(() => {});
      sub = null;
    }
  }
  sub ||= await ready.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64ToBytes(publicKey),
  });
  const json = sub.toJSON();
  await rpc("subscribe", {
    p_id: editionId,
    p_slot: slot,
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
  });
  saveMe({ edition: editionId, slot, push: true });
  return { push: true };
}

/** Para de seguir: apaga a inscrição do servidor e do aparelho. */
export async function unfollow() {
  saveMe(null);
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager?.getSubscription();
  if (!sub) return;
  await rpc("unsubscribe", { p_endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

/** Organizador: avisa as duplas de um ou mais jogos. */
export function notifyGames(editionId, action, games, court = "") {
  return callFunction("POST", { edition: editionId, action, games, court });
}

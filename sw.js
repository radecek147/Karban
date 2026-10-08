// Service worker Karbanu — vygenerováno při buildu (scripts/sw-plugin.ts ze src/sw/sw.ts), neupravuj.
const __SW_VERSION__ = "2f06ce5d5e60";
const __SW_PRECACHE__ = ["./","assets/art-C97OFNl1.js","assets/barlow-semi-condensed-latin-500-italic-nooauXyR.woff2","assets/barlow-semi-condensed-latin-500-normal-G0uxJNrM.woff2","assets/barlow-semi-condensed-latin-600-normal-BkLiAYu4.woff2","assets/barlow-semi-condensed-latin-700-normal-BpqDG8I9.woff2","assets/barlow-semi-condensed-latin-ext-500-italic-DOLt4dhK.woff2","assets/barlow-semi-condensed-latin-ext-500-normal-BXdp1BvY.woff2","assets/barlow-semi-condensed-latin-ext-600-normal-BkQ9hN72.woff2","assets/barlow-semi-condensed-latin-ext-700-normal-BhgEo64M.woff2","assets/big-shoulders-display-latin-700-normal-KM2fueoL.woff2","assets/big-shoulders-display-latin-800-normal-DDUD9Xuh.woff2","assets/big-shoulders-display-latin-ext-700-normal-C8xZtiKd.woff2","assets/big-shoulders-display-latin-ext-800-normal-fpv_pHPA.woff2","assets/challenges-CyJqj5MP.js","assets/collection-Ckz2rmKk.js","assets/consumableCard-p4bRfNiC.js","assets/content-Dl_DHwep.js","assets/credits-CtKqkBEL.js","assets/daily-BQRAFDm9.js","assets/engine-DU_OfObW.js","assets/gallery-Dw34xVMw.js","assets/game-C05D3YrM.js","assets/i18n-oOwLmR16.js","assets/icons-C1IBhyTE.js","assets/index-Cc6TtqBz.js","assets/index-khjOytyl.css","assets/jokerCard-CGHX9wfv.js","assets/newGame-7ZGJTw82.js","assets/rolldown-runtime-DK3Fl9T5.js","assets/settings-Cb8kXr_p.js","assets/stats-Db2NPOKG.js","assets/tabs-B824Z0Er.js"];
const CACHE_PREFIX = "karban-";
const CACHE_NAME = `${CACHE_PREFIX}${__SW_VERSION__}`;
/** Rozsah workeru = adresář hry (`/` lokálně, `/FM/` na GitHub Pages). */
const SCOPE = self.registration.scope;
/** Klíč app shellu (index.html) v cache. */
const SHELL_URL = new URL("./", SCOPE).href;
const INDEX_URL = new URL("index.html", SCOPE).href;
const PRECACHE_URLS = __SW_PRECACHE__.map((path) => new URL(path, SCOPE).href);
/** Soubory s otiskem obsahu v názvu se nikdy nemění — při aktualizaci je lze převzít ze staré cache. */
const HASHED_ASSET = /\/assets\/[^/]+-[\w-]{8,}\.\w+$/;
function oldCacheNames() {
	return caches.keys().then((keys) => keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME));
}
/** Uloží jeden soubor buildu: z předchozí verze (hashovaný asset), jinak ze sítě mimo HTTP cache. */
async function precacheOne(cache, url, previous) {
	if (HASHED_ASSET.test(url)) {
		for (const old of previous) {
			const hit = await old.match(url);
			if (hit) {
				await cache.put(url, hit);
				return;
			}
		}
	}
	const response = await fetch(new Request(url, { cache: "reload" }));
	if (!response.ok) throw new Error(`Precache ${url}: HTTP ${response.status}`);
	// Přesměrovanou odpověď (`/FM` → `/FM/`) nesmí worker vrátit navigaci — uloží se jako čistá kopie.
	const clean = response.redirected ? new Response(await response.blob(), {
		status: response.status,
		headers: response.headers
	}) : response;
	await cache.put(url, clean);
}
async function install() {
	const cache = await caches.open(CACHE_NAME);
	const previous = await Promise.all((await oldCacheNames()).map((name) => caches.open(name)));
	// Chyba kteréhokoli souboru shodí instalaci — neúplná cache by offline nefungovala (zkusí se znovu příště).
	await Promise.all(PRECACHE_URLS.map((url) => precacheOne(cache, url, previous)));
}
async function activate() {
	await Promise.all((await oldCacheNames()).map((name) => caches.delete(name)));
	await self.clients.claim();
}
/** Navigace na samotnou hru (adresář nebo index.html, s libovolnými parametry). */
function isAppNavigation(request) {
	if (request.mode !== "navigate") return false;
	const url = new URL(request.url);
	const page = `${url.origin}${url.pathname}`;
	return page === SHELL_URL || page === INDEX_URL;
}
async function respond(request) {
	const cache = await caches.open(CACHE_NAME);
	const cached = isAppNavigation(request) ? await cache.match(SHELL_URL) : await cache.match(request);
	return cached ?? fetch(request);
}
self.addEventListener("install", (e) => e.waitUntil(install()));
self.addEventListener("activate", (e) => e.waitUntil(activate()));
self.addEventListener("fetch", (e) => {
	const { request } = e;
	// Jen soubory hry (rozsah obsahuje i origin); cizí adresy a POST jdou rovnou na síť.
	if (request.method !== "GET" || !request.url.startsWith(SCOPE)) return;
	e.respondWith(respond(request));
});

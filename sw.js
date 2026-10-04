// Service worker Karbanu — vygenerováno při buildu (scripts/sw-plugin.ts ze src/sw/sw.ts), neupravuj.
const __SW_VERSION__ = "d9abcad640f0";
const __SW_PRECACHE__ = ["./","assets/art-EtSQmBjb.js","assets/challenges-De1QikiU.js","assets/collection-CUCTFGIt.js","assets/consumableCard-CxNAM4WA.js","assets/content-IYInZj6e.js","assets/credits-BNhCj5hA.js","assets/daily-Zb_6TJHg.js","assets/engine-4pVZTDD7.js","assets/gallery-DxL73Gho.js","assets/game-BAQ_R6Qq.js","assets/i18n-avYc3wmK.js","assets/icons-C1IBhyTE.js","assets/index-COPPXcx9.css","assets/index-CZuvmz7S.js","assets/jokerCard-DnJjtoqk.js","assets/newGame-DxC2Q61o.js","assets/pixelify-sans-latin-400-normal-DLrIX9QE.woff2","assets/pixelify-sans-latin-700-normal-D3Xxx3QE.woff2","assets/pixelify-sans-latin-ext-400-normal-DdH6zlBQ.woff2","assets/pixelify-sans-latin-ext-700-normal-ClyJstAh.woff2","assets/rolldown-runtime-DK3Fl9T5.js","assets/runStart-B23gYTIp.js","assets/seed-BRpZaCqe.js","assets/settings-BkHL8_Jm.js","assets/stats-DJS-rhEX.js","assets/tabs-FPel8Nwl.js"];
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

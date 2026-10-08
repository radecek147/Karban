// Service worker Karbanu — vygenerováno při buildu (scripts/sw-plugin.ts ze src/sw/sw.ts), neupravuj.
const __SW_VERSION__ = "a094a6599556";
const __SW_PRECACHE__ = ["./","404.html","assets/art-SMTqyDjq.js","assets/barlow-semi-condensed-latin-500-italic-nooauXyR.woff2","assets/barlow-semi-condensed-latin-500-normal-G0uxJNrM.woff2","assets/barlow-semi-condensed-latin-600-normal-BkLiAYu4.woff2","assets/barlow-semi-condensed-latin-700-normal-BpqDG8I9.woff2","assets/barlow-semi-condensed-latin-ext-500-italic-DOLt4dhK.woff2","assets/barlow-semi-condensed-latin-ext-500-normal-BXdp1BvY.woff2","assets/barlow-semi-condensed-latin-ext-600-normal-BkQ9hN72.woff2","assets/barlow-semi-condensed-latin-ext-700-normal-BhgEo64M.woff2","assets/big-shoulders-display-latin-700-normal-KM2fueoL.woff2","assets/big-shoulders-display-latin-800-normal-DDUD9Xuh.woff2","assets/big-shoulders-display-latin-ext-700-normal-C8xZtiKd.woff2","assets/big-shoulders-display-latin-ext-800-normal-fpv_pHPA.woff2","assets/challenges-eKqXaMYl.js","assets/collection-PpyhF08P.js","assets/consumableCard-GnE_ykiW.js","assets/content-8n4i06Af.js","assets/credits-Dv4pYm_5.js","assets/daily-CVojARKL.js","assets/engine-BTJ4-EEQ.js","assets/gallery-DhF0kaDL.js","assets/game-C4AtUn2c.js","assets/i18n-C4o0q3XR.js","assets/icons-C1IBhyTE.js","assets/index-Iv7SX9tQ.js","assets/index-khjOytyl.css","assets/jokerCard-BnNe-Tam.js","assets/newGame-CfBIWHgP.js","assets/rolldown-runtime-DK3Fl9T5.js","assets/settings-CJ43tmBe.js","assets/stats-Dz2ahNt2.js","assets/tabs-CXtM__Bp.js","sestava/","sestava/bez-fotografa/","sestava/fotograf/","sestava/nejsilnejsi/"];
const CACHE_PREFIX = "karban-";
const CACHE_NAME = `${CACHE_PREFIX}${__SW_VERSION__}`;
/** Rozsah workeru = adresář hry (`/` lokálně, `/FM/` na GitHub Pages). */
const SCOPE = self.registration.scope;
/** Klíč app shellu (index.html) v cache. */
const SHELL_URL = new URL("./", SCOPE).href;
const INDEX_URL = new URL("index.html", SCOPE).href;
/** Stránka 404 (kopie app shellu, jen GitHub Pages): offline náhrada za neznámou adresu pod hrou. */
const NOT_FOUND_URL = new URL("404.html", SCOPE).href;
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
	// Ostatní navigace (stránky odkazů na sestavy `sestava/<id>/`) bez ohledu na parametry — chat a sociální sítě
	// přidávají `?fbclid=…` a podobně; offline by jinak odkaz nenašel stránku v cache.
	const navigate = request.mode === "navigate";
	const cached = isAppNavigation(request) ? await cache.match(SHELL_URL) : await cache.match(request, { ignoreSearch: navigate });
	if (cached) return cached;
	if (!navigate) return fetch(request);
	// Offline navigace na adresu, kterou cache nezná (`sestava/fotograf` bez lomítka, jiná velikost písmen):
	// kopie shellu z 404.html si sestavu najde sama; bez ní (relativní build) chyba prohlížeče jako dřív.
	try {
		return await fetch(request);
	} catch (err) {
		const fallback = await cache.match(NOT_FOUND_URL);
		if (fallback) return fallback;
		throw err;
	}
}
self.addEventListener("install", (e) => e.waitUntil(install()));
self.addEventListener("activate", (e) => e.waitUntil(activate()));
self.addEventListener("fetch", (e) => {
	const { request } = e;
	// Jen soubory hry (rozsah obsahuje i origin); cizí adresy a POST jdou rovnou na síť.
	if (request.method !== "GET" || !request.url.startsWith(SCOPE)) return;
	e.respondWith(respond(request));
});

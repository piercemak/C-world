const APP_CACHE = "cworld-app-v1";
const IMAGE_CACHE = "cworld-images-v1";
const RUNTIME_CACHE = "cworld-runtime-v1";
const CACHE_NAMES = new Set([APP_CACHE, IMAGE_CACHE, RUNTIME_CACHE]);

const APP_SHELL = [
  "/",
  "/index.html",
];

const VIDEO_EXTENSIONS = /\.(mp4|m4v|mkv|mov|webm)(\?|$)/i;
const CACHEABLE_STATIC_EXTENSIONS = /\.(css|js|json|map|svg|png|jpe?g|webp|avif|gif|ico|woff2?|ttf)(\?|$)/i;

const isApiRequest = (url) => url.pathname.startsWith("/api/");
const isVideoRequest = (request, url) => (
  request.destination === "video"
  || request.destination === "audio"
  || VIDEO_EXTENSIONS.test(url.pathname)
);

const isCacheableResponse = (response) => (
  response
  && (response.ok || response.type === "opaque")
);

const putCache = async (cacheName, request, response) => {
  if (!isCacheableResponse(response)) return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
};

const networkFirst = async (request, fallbackUrl = "/index.html") => {
  try {
    const response = await fetch(request);
    await putCache(APP_CACHE, request, response);
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match(fallbackUrl);
  }
};

const cacheFirst = async (request, cacheName) => {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  await putCache(cacheName, request, response);
  return response;
};

const staleWhileRevalidate = async (request, cacheName) => {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async (response) => {
      await putCache(cacheName, request, response);
      return response;
    })
    .catch(() => null);

  return cached || network || Response.error();
};

const warmAssets = async (urls) => {
  if (!Array.isArray(urls) || urls.length === 0) return;

  const cache = await caches.open(IMAGE_CACHE);
  await Promise.allSettled(urls.map(async (url) => {
    const request = new Request(new URL(url, self.location.origin).href, { credentials: "same-origin" });
    const cached = await cache.match(request);
    if (cached) return;

    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      await cache.put(request, response);
    }
  }));
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => (
        CACHE_NAMES.has(key) ? undefined : caches.delete(key)
      ))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CWORLD_WARM_OFFLINE_ASSETS") {
    event.waitUntil(warmAssets(event.data.urls));
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (isApiRequest(url) || isVideoRequest(request, url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.destination === "image" || url.pathname.startsWith("/images/")) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  if (url.origin === self.location.origin && (
    url.pathname.startsWith("/assets/")
    || CACHEABLE_STATIC_EXTENSIONS.test(url.pathname)
  )) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});

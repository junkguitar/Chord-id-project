const CACHE = 'jazz-trainer-v2';
const ASSETS = [
  '.','index.html','app.js','manifest.json','icon-192.png','icon-512.png'
];
self.addEventListener('install', evt=>{
  evt.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.concat(["piano-samples/36.wav", "piano-samples/37.wav", "piano-samples/38.wav", "piano-samples/39.wav", "piano-samples/40.wav", "piano-samples/41.wav", "piano-samples/42.wav", "piano-samples/43.wav", "piano-samples/44.wav", "piano-samples/45.wav", "piano-samples/46.wav", "piano-samples/47.wav", "piano-samples/48.wav", "piano-samples/49.wav", "piano-samples/50.wav", "piano-samples/51.wav", "piano-samples/52.wav", "piano-samples/53.wav", "piano-samples/54.wav", "piano-samples/55.wav", "piano-samples/56.wav", "piano-samples/57.wav", "piano-samples/58.wav", "piano-samples/59.wav", "piano-samples/60.wav", "piano-samples/61.wav", "piano-samples/62.wav", "piano-samples/63.wav", "piano-samples/64.wav", "piano-samples/65.wav", "piano-samples/66.wav", "piano-samples/67.wav", "piano-samples/68.wav", "piano-samples/69.wav", "piano-samples/70.wav", "piano-samples/71.wav", "piano-samples/72.wav", "piano-samples/73.wav", "piano-samples/74.wav", "piano-samples/75.wav", "piano-samples/76.wav", "piano-samples/77.wav", "piano-samples/78.wav", "piano-samples/79.wav", "piano-samples/80.wav", "piano-samples/81.wav", "piano-samples/82.wav", "piano-samples/83.wav", "piano-samples/84.wav"]))).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', evt=>{ evt.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', evt=>{ evt.respondWith(caches.match(evt.request).then(r=> r || fetch(evt.request))); });

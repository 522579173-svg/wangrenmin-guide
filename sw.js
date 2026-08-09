/* 全国景点讲解 - PWA 离线缓存
 * v4：恢复可安装所需的 Service Worker；页面始终 network-first，避免旧缓存卡版本。
 */
var CACHE = "spot-guide-v4";
var FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-144.png",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(FILES); })
    .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;

  // 页面导航请求（HTML）：network-first，保证总是拿到最新版
  if(e.request.mode === "navigate" || e.request.destination === "document"){
    e.respondWith(
      fetch(e.request).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        return res;
      }).catch(function(){
        return caches.match(e.request).then(function(hit){ return hit || caches.match("index.html"); });
      })
    );
    return;
  }

  // 静态资源：stale-while-revalidate（先返回缓存，后台更新）
  e.respondWith(
    caches.match(e.request).then(function(hit){
      var network = fetch(e.request).then(function(res){
        if(res && res.ok){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      }).catch(function(){ return hit; });
      return hit || network;
    })
  );
});

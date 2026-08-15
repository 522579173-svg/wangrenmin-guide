/* 全国景点讲解 - PWA 离线缓存
 * v5：新增高德地图瓦片离线缓存（cache-first），景区没信号也能看图
 * 2026-08-12：缓存版本 v4→v5，强制已安装的 PWA 客户端更新到新版（点击识别修复版）
 */
var CACHE = "spot-guide-v5";
var TILE_CACHE = "spot-guide-tiles";   /* 高德瓦片专用缓存 */
var TILE_MAX = 1500;                   /* 瓦片张数上限，超出删最旧 1/3 */
var FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./lib/leaflet.js",
  "./lib/leaflet.css",
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

  var url = e.request.url || "";

  /* 高德地图瓦片：cache-first（离线也能看图），后台补缓存 + 上限清理 */
  if(/\.is\.autonavi\.com\/appmaptile/.test(url)){
    e.respondWith(
      caches.open(TILE_CACHE).then(function(c){
        return c.match(e.request).then(function(hit){
          if(hit) return hit;
          return fetch(e.request).then(function(res){
            /* opaque 跨域响应也能存（Chrome）；Safari 不支持时 try-catch 静默降级 */
            if(res && (res.ok || res.type === "opaque")){
              try{
                c.put(e.request, res.clone());
                trimTiles(c);
              }catch(err){}
            }
            return res;
          }).catch(function(){ return hit; });
        });
      })
    );
    return;
  }

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

/* 瓦片缓存上限：超出时删最旧 1/3（Cache keys 按插入顺序） */
function trimTiles(cache){
  return cache.keys().then(function(keys){
    if(keys.length > TILE_MAX){
      var drop = keys.slice(0, Math.floor(keys.length / 3));
      return Promise.all(drop.map(function(k){ return cache.delete(k); }));
    }
  }).catch(function(){});
}

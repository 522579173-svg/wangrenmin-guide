/* ============================================================
 * 高德安全代理 · Vercel Serverless Function（与 CloudBase 云函数同步维护）
 * ------------------------------------------------------------
 * 作用：把高德 Web服务 Key 藏在服务器端（环境变量），
 *       前端不再暴露 Key；同时规避浏览器 CORS 限制。
 *
 * 支持四种模式（同一接口，按参数区分）：
 *   ① 逆地理编码：?lat=30.24&lng=120.15
 *      → 返回 { data: { regeocode: { formatted_address, pois[] } } }
 *   ② POI 关键词搜索（自动生成景区地图）：
 *      ?keywords=西湖&city=杭州&offset=25
 *      → 返回 { data: { poi: { pois: [{name,location,type,cityname,...}], count, suggestion } } }
 *   ③ POI 周边搜索（点击底图反查景点）：
 *      ?location=116.3970,39.9151&radius=500&offset=25
 *      → 按距离排序返回 { data: { poi: { pois: [{name,location,type,...}], count } } }
 *   ④ 驾车路线规划：?origin=lng,lat&destination=lng,lat&waypoints=可选
 *      → 返回 { data: { direction: { distance, duration, polyline, steps[] } } }
 *
 * 配置方法（Vercel）：
 *   Settings → Environment Variables 添加：
 *     Name:  AMAP_KEY
 *     Value: 你在 lbs.amap.com 申请的「Web服务」Key（免费）
 *   （改完环境变量后需要重新部署一次才生效）
 *
 * 前端设置页「高德代理地址」填：
 *   /api/geocode
 *   或 https://你的域名/api/geocode
 *
 * 调用方式：GET /api/geocode?lat=30.24&lng=120.15
 * ============================================================ */
module.exports = async function handler(req, res) {
  // ---- CORS ----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "GET") { res.status(405).json({ error: "Method Not Allowed" }); return; }

  var AMAP_KEY = process.env.AMAP_KEY || "";
  if (!AMAP_KEY) {
    res.status(400).json({
      error: "未配置 AMAP_KEY 环境变量。请在 Vercel 项目 Settings → Environment Variables 添加 AMAP_KEY（高德 lbs.amap.com 免费注册 Web服务 Key）。"
    });
    return;
  }

  /* ② POI 关键词搜索模式（自动生成景区地图）：?keywords=西湖&city=杭州&offset=25 */
  if (req.query.keywords) {
    var keywords = req.query.keywords;
    var city = req.query.city || "";
    var offset = parseInt(req.query.offset || "25", 10) || 25;
    var url = "https://restapi.amap.com/v3/place/text?keywords=" +
      encodeURIComponent(keywords) +
      "&key=" + encodeURIComponent(AMAP_KEY) +
      "&offset=" + offset + "&page=1&extensions=base";
    if (city) url += "&city=" + encodeURIComponent(city) + "&citylimit=true";
    var r = await fetch(url);
    var data = await r.json();
    res.status(200).json({ source: "amap-proxy", data: { poi: { pois: data.pois || [], count: data.count || 0, suggestion: data.suggestion || {} } } });
    return;
  }

  /* ③ POI 周边搜索模式：?location=116.3970,39.9151&radius=500 */
  if (req.query.location) {
    var radius = parseInt(req.query.radius || "500", 10) || 500;
    var offset = parseInt(req.query.offset || "25", 10) || 25;
    var page = parseInt(req.query.page || "1", 10) || 1;
    /* sortrule=distance：必须按距离排序（高德默认按推荐度，会把想点的 POI 排到几十名外） */
    var url = "https://restapi.amap.com/v3/place/around?location=" +
      encodeURIComponent(req.query.location) +
      "&key=" + encodeURIComponent(AMAP_KEY) +
      "&radius=" + radius + "&offset=" + offset + "&page=" + page +
      "&sortrule=distance&extensions=base";
    var r = await fetch(url);
    var data = await r.json();
    res.status(200).json({ source: "amap-proxy", data: { poi: { pois: data.pois || [], count: data.count || 0 } } });
    return;
  }

  /* ④ 驾车路线规划模式：?origin=lng,lat&destination=lng,lat&waypoints=可选(｜分隔) */
  if (req.query.origin && req.query.destination) {
    var wps = req.query.waypoints || "";
    var url = "https://restapi.amap.com/v3/direction/driving?origin=" +
      encodeURIComponent(req.query.origin) +
      "&destination=" + encodeURIComponent(req.query.destination) +
      "&key=" + encodeURIComponent(AMAP_KEY) +
      "&extensions=all&strategy=10";
    if (wps) url += "&waypoints=" + encodeURIComponent(wps);
    var r = await fetch(url);
    var data = await r.json();
    var route = (data.route && data.route.paths && data.route.paths[0]) || null;
    var navSteps = (route && route.steps || []).map(function(s){
      var first = String(s.polyline || "").split(";")[0];
      var ll = first ? first.split(",") : [];
      return {
        instruction: s.instruction || "",
        lat: ll.length > 1 ? parseFloat(ll[1]) : null,
        lng: ll.length > 1 ? parseFloat(ll[0]) : null
      };
    }).filter(function(s){ return isFinite(s.lat) && isFinite(s.lng); });
    res.status(200).json({
      source: "amap-proxy",
      data: {
        direction: {
          distance: route ? route.distance || 0 : 0,
          duration: route ? route.duration || 0 : 0,
          polyline: route && route.steps ? route.steps.map(function(s){ return s.polyline || ""; }).join(";") : "",
          steps: navSteps
        }
      }
    });
    return;
  }

  var lat = req.query.lat, lng = req.query.lng;
  if (!lat || !lng) {
    res.status(400).json({ error: "缺少 lat / lng 参数，应形如 /api/geocode?lat=30.24&lng=120.15" });
    return;
  }

  try {
    var url = "https://restapi.amap.com/v3/geocode/regeo?location=" +
      encodeURIComponent(lng + "," + lat) +
      "&key=" + encodeURIComponent(AMAP_KEY) +
      "&extensions=all";
    var r = await fetch(url);
    var data = await r.json();
    res.status(200).json({ source: "amap-proxy", data: data });
  } catch (e) {
    res.status(502).json({ error: "高德请求失败: " + (e && e.message ? e.message : e) });
  }
};

/* ============================================================
 * 高德逆地理编码安全代理 · Vercel Serverless Function
 * ------------------------------------------------------------
 * 作用：把高德 Web服务 Key 藏在服务器端（环境变量），
 *       前端不再暴露 Key；同时规避浏览器 CORS 限制。
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

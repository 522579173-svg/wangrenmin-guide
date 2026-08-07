/* ============================================================
 * DeepSeek 安全代理 · Vercel Serverless Function
 * ------------------------------------------------------------
 * 作用：把 DeepSeek API Key 藏在服务器端（环境变量），
 *       前端页面不再暴露 Key，防止被任何人从浏览器 F12 看到。
 *
 * 配置方法（Vercel）：
 *   Settings → Environment Variables 添加：
 *     Name:  DEEPSEEK_KEY
 *     Value: sk-你的DeepSeekKey
 *   （改完环境变量后需要重新部署一次才生效）
 *
 * 前端设置页「DeepSeek 代理地址」填：
 *   /api/deepseek                      （部署在根域名时）
 *   或 https://你的域名/api/deepseek    （跨域时）
 *
 * 兼容两种调用：
 *   1. 安全模式（推荐）：前端不传 Authorization，本函数自动带环境变量 Key；
 *   2. 转发模式：前端自带 Authorization，本函数原样转发（兼容旧直连逻辑）。
 * ============================================================ */
module.exports = async function handler(req, res) {
  // ---- CORS ----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method Not Allowed" }); return; }

  var DEEPSEEK_KEY = process.env.DEEPSEEK_KEY || "";
  var auth = (req.headers && req.headers.authorization) || (DEEPSEEK_KEY ? "Bearer " + DEEPSEEK_KEY : "");
  if (!auth) {
    res.status(400).json({
      error: "未配置 DEEPSEEK_KEY 环境变量，且前端也未传 Authorization。请在 Vercel 项目 Settings → Environment Variables 添加 DEEPSEEK_KEY。"
    });
    return;
  }

  var body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    res.status(400).json({ error: "请求体不是合法 JSON" });
    return;
  }

  var messages = body.messages || [];
  if (!Array.isArray(messages) || !messages.length) {
    res.status(400).json({ error: "messages 不能为空" });
    return;
  }

  var payload = {
    model: body.model || "deepseek-chat",
    messages: messages,
    temperature: typeof body.temperature === "number" ? body.temperature : 0.8,
    max_tokens: typeof body.max_tokens === "number" ? body.max_tokens : 1000
  };

  try {
    var r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": auth
      },
      body: JSON.stringify(payload)
    });
    var data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: "DeepSeek 请求失败: " + (e && e.message ? e.message : e) });
  }
};

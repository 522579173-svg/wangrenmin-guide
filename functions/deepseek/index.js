/* ============================================================
 * DeepSeek 安全代理 · 腾讯云 CloudBase 云函数版
 * ------------------------------------------------------------
 * 用法：
 *   1. 在 CloudBase 控制台「云函数」→ 新建函数
 *      - 名称：deepseek
 *      - 运行环境：Nodejs 16.13（或更高）
 *      - 把本文件全部内容粘贴到 index.js（覆盖默认代码）
 *   2. 「配置」→ 环境变量 添加：
 *      DEEPSEEK_KEY = sk-你的DeepSeekKey
 *   3. 「HTTP 访问服务」→ 添加路径：/deepseek，方法：POST
 *   4. 前端设置页「DeepSeek 代理地址」填：
 *      https://<你的环境ID>.service.tcloudbase.com/deepseek
 * ============================================================ */
const https = require('https');

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          reject(new Error('上游响应解析失败'));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

exports.main = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store'
  };

  const httpMethod = (event && event.httpMethod) || 'POST';
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY || '';
  const reqHeaders = (event && event.headers) || {};
  const authHeader = reqHeaders.authorization || reqHeaders.Authorization || '';
  const auth = authHeader || (DEEPSEEK_KEY ? 'Bearer ' + DEEPSEEK_KEY : '');

  if (!auth) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '未配置 DEEPSEEK_KEY 环境变量，且前端也未传 Authorization。请在云函数「配置」中添加 DEEPSEEK_KEY。' })
    };
  }

  let body = {};
  try {
    body = JSON.parse((event && event.body) || '{}');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: '请求体不是合法 JSON' }) };
  }

  const messages = body.messages || [];
  if (!Array.isArray(messages) || !messages.length) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'messages 不能为空' }) };
  }

  const payload = {
    model: body.model || 'deepseek-chat',
    messages: messages,
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.8,
    max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 1000
  };

  try {
    const r = await httpsRequest({
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth
      }
    }, payload);
    return { statusCode: r.status, headers, body: JSON.stringify(r.data) };
  } catch (e) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'DeepSeek 请求失败: ' + ((e && e.message) || e) })
    };
  }
};

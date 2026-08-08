/* ============================================================
 * 高德逆地理编码安全代理 · 腾讯云 CloudBase 云函数版
 * ------------------------------------------------------------
 * 用法：
 *   1. 在 CloudBase 控制台「云函数」→ 新建函数
 *      - 名称：geocode
 *      - 运行环境：Nodejs 16.13（或更高）
 *      - 把本文件全部内容粘贴到 index.js（覆盖默认代码）
 *   2. 「配置」→ 环境变量 添加：
 *      AMAP_KEY = 你的高德Web服务Key（lbs.amap.com 免费注册）
 *   3. 「HTTP 访问服务」→ 添加路径：/geocode，方法：GET
 *   4. 前端设置页「高德代理地址」填：
 *      https://<你的环境ID>.service.tcloudbase.com/geocode
 *
 * 注意：若没填高德 Key，前端会自动用 OpenStreetMap 兜底（免费免key），
 *       所以这一步是可选的，先不配也不影响使用。
 * ============================================================ */
const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          reject(new Error('上游响应解析失败'));
        }
      });
    }).on('error', reject);
  });
}

exports.main = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  };

  const httpMethod = (event && event.httpMethod) || 'GET';
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const q = (event && event.queryStringParameters) || {};
  const lat = q.lat;
  const lng = q.lng;
  if (!lat || !lng) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: '缺少 lat/lng 参数' }) };
  }

  const AMAP_KEY = process.env.AMAP_KEY || '';
  if (!AMAP_KEY) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '未配置 AMAP_KEY 环境变量' })
    };
  }

  const url = 'https://restapi.amap.com/v3/geocode/regeo?location=' +
    encodeURIComponent(lng) + ',' + encodeURIComponent(lat) +
    '&key=' + encodeURIComponent(AMAP_KEY) + '&extensions=all';

  try {
    const r = await httpsGet(url);
    const d = r.data || {};
    const regeocode = d.regeocode || {};
    return {
      statusCode: r.status,
      headers,
      body: JSON.stringify({
        data: {
          regeocode: {
            formatted_address: regeocode.formatted_address || '',
            pois: (regeocode.pois || []).slice(0, 10)
          }
        }
      })
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: '高德请求失败: ' + ((e && e.message) || e) })
    };
  }
};

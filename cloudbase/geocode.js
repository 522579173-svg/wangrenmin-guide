/* ============================================================
 * 高德安全代理 · 腾讯云 CloudBase 云函数版
 * ------------------------------------------------------------
 * 支持两种模式（同一接口，按参数区分）：
 *
 * ① 逆地理编码：?lat=30.24&lng=120.15
 *    → 返回 { data: { regeocode: { formatted_address, pois[] } } }
 *
 * ② POI 关键词搜索（用于自动生成景区地图）：
 *    ?keywords=西湖&city=杭州&offset=25
 *    → 返回 { data: { poi: { pois: [{name,location,type,address,...}], count } } }
 *

 * 用法：
 *   1. CloudBase 控制台「云函数」→ geocode（已有）→ 编辑代码，粘贴本文件
 *   2. 「配置」→ 环境变量：AMAP_KEY = 你的高德Web服务Key
 *   3. 「HTTP 访问服务」已有 /geocode 路径，无需改动
 *   4. 前端设置页「高德代理地址」填：
 *      https://<你的环境ID>.ap-shanghai.app.tcloudbase.com/geocode
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
  const AMAP_KEY = process.env.AMAP_KEY || '';
  if (!AMAP_KEY) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '未配置 AMAP_KEY 环境变量' })
    };
  }

  /* ---------- ② POI 关键词搜索模式 ---------- */
  if (q.keywords) {
    const keywords = q.keywords;
    const city = q.city || '';
    const offset = parseInt(q.offset || '25', 10) || 25;
    let url = 'https://restapi.amap.com/v3/place/text?keywords=' +
      encodeURIComponent(keywords) +
      '&key=' + encodeURIComponent(AMAP_KEY) +
      '&offset=' + offset + '&page=1&extensions=base';
    if (city) {
      url += '&city=' + encodeURIComponent(city) + '&citylimit=true';
    }
    try {
      const r = await httpsGet(url);
      const d = r.data || {};
      const pois = (d.pois || []).map(function (p) {
        return {
          name: p.name || '',
          location: p.location || '',
          type: p.type || '',
          address: p.address || '',
          pname: p.pname || '',
          cityname: p.cityname || '',
          adname: p.adname || ''
        };
      });
      return {
        statusCode: r.status,
        headers,
        body: JSON.stringify({
          data: {
            poi: {
              pois: pois,
              count: d.count || 0,
              suggestion: d.suggestion || {}
            }
          }
        })
      };
    } catch (e) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: '高德POI搜索失败: ' + ((e && e.message) || e) })
      };
    }
  }

  /* ---------- ③ POI 周边搜索模式（点击底图反查景点） ---------- */
  if (q.location) {
    const location = q.location;
    const radius = parseInt(q.radius || '200', 10) || 200;
    const types = q.types || '';
    const offset = parseInt(q.offset || '20', 10) || 20;
    const page = parseInt(q.page || '1', 10) || 1; /* 翻页透传：高德around按推荐度排序非距离，前端翻页拉全 */
    let url = 'https://restapi.amap.com/v3/place/around?location=' +
      encodeURIComponent(location) +
      '&key=' + encodeURIComponent(AMAP_KEY) +
      '&radius=' + radius + '&offset=' + offset + '&page=' + page + '&extensions=base';
    if (types) {
      url += '&types=' + encodeURIComponent(types);
    }
    try {
      const r = await httpsGet(url);
      const d = r.data || {};
      const pois = (d.pois || []).map(function (p) {
        return {
          name: p.name || '',
          location: p.location || '',
          type: p.type || '',
          address: p.address || '',
          pname: p.pname || '',
          cityname: p.cityname || '',
          adname: p.adname || ''
        };
      });
      return {
        statusCode: r.status,
        headers,
        body: JSON.stringify({
          data: {
            poi: {
              pois: pois,
              count: d.count || 0
            }
          }
        })
      };
    } catch (e) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: '高德周边搜索失败: ' + ((e && e.message) || e) })
      };
    }
  }

  /* ---------- ① 逆地理编码模式 ---------- */
  const lat = q.lat;
  const lng = q.lng;
  if (!lat || !lng) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: '缺少 lat/lng 或 keywords 参数' }) };
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

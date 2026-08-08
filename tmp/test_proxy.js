// 用 Node.js 测试 CloudBase 代理接口（Node 默认 UTF-8，和浏览器一致）
const https = require('https');

const data = JSON.stringify({
  messages: [
    { role: 'user', content: '你是资深中文导游，请用80字介绍杭州西湖断桥，语气亲切自然。' }
  ]
});

const req = https.request({
  hostname: 'guide-d4grybdwde2f9d281-1432633719.ap-shanghai.app.tcloudbase.com',
  path: '/deepseek',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let raw = '';
  res.on('data', (c) => raw += c);
  res.on('end', () => {
    console.log('HTTP', res.statusCode);
    try {
      const json = JSON.parse(raw);
      const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
      console.log('模型:', json.model);
      console.log('讲解内容:', content);
    } catch (e) {
      console.log('原始响应:', raw.slice(0, 800));
    }
  });
});
req.on('error', (e) => console.log('请求失败:', e.message));
req.write(data);
req.end();

// file: api/session.js
console.log('=== session.js top-level code ===');

const express = require('express');
const app = express();

// 统一使用 '/api/session' 作为路由
app.get('/api/session', (req, res) => {
  console.log('=== session.js: matched GET /api/session');
  res.json({ msg: 'Hello from /api/session - works both locally and on Vercel!' });
});

// 判断当前脚本是否是用 "node api/session.js" 启动（本地开发）
if (require.main === module) {
  // 本地模式：监听 3000 端口
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Local dev server listening at http://localhost:${PORT}`);
    console.log('Try GET http://localhost:3000/api/session');
  });
} else {
  // Vercel serverless 模式：导出给 Vercel 处理
  module.exports = (req, res) => {
    return app(req, res);
  };
}
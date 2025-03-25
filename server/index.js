// file: server/index.js
const express = require('express');
const path = require('path');
const apiSession = require('../api/session');

const app = express();

// 1) 托管静态前端资源
app.use(express.static(path.join(__dirname, '..')));

// 2) 当本地请求 /api/session(...) 时，转到 sessionFunction
app.use('/api/session', (req, res) => {
  // 本地时, Express 会把 '/api/session' 剥离成 '/', 这样 session.js 内部路由就匹配 '/'
  apiSession(req, res);
});

// 3) 访问根路径时, 返回 index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// 4) 启动本地服务器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ 本地服务器运行中: http://localhost:${PORT}`);
  console.log(`试试：GET http://localhost:${PORT}/api/session （会提示Session not found, 因为没id）`);
  console.log(`或发 POST http://localhost:${PORT}/api/session 来创建一个`);
});
// file: server/index.js
const express = require('express');
const path = require('path');
const apiSession = require('../api/session'); // 这里是 session.js

const app = express();

// 托管静态前端资源
app.use(express.static(path.join(__dirname, '..')));

// 相当于: 当本地请求 /api/session/... 时, 进到 session.js
app.use('/api/session', (req, res) => {
  apiSession(req, res);
});

// 首页返回 index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// 启动本地服务
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ 本地服务器运行中：http://localhost:${PORT}`);
});
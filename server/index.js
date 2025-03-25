// const express = require('express');
// const path = require('path');
// const apiSession = require('../api/session');

// const app = express();

// // 托管静态前端资源
// app.use(express.static(path.join(__dirname, '..')));

// // 路由代理：/api/session -> api/session.js
// app.use('/api/session', apiSession);

// // 首页返回 index.html
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, '../index.html'));
// });

// // 启动本地服务
// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`✅ 本地服务器运行中：http://localhost:${PORT}`);
// });


// file: server/index.js
const express = require('express');
const path = require('path');

// 引入 "api/session.js" 导出的那个无服务器函数
const sessionFunction = require('../api/session.js');

const app = express();

// 在本地，我们把所有请求交给 sessionFunction
// 这样当你访问 /api/session 时，会进入 sessionFunction → 匹配 '/api/session'
app.use((req, res) => {
  sessionFunction(req, res);
});

// 启动本地服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Local dev server listening on http://localhost:${PORT}`);
  console.log(`Try GET http://localhost:${PORT}/api/session`);
});
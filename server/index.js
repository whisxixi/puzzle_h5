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
// file: server/index.js
const express = require('express');
const sessionFunction = require('../api/session.js'); // 就是上面那个 module.exports

const app = express();

// 本地环境: 将任何请求转发给 sessionFunction
// 这样 http://localhost:3000/api/session 时，会调用 session.js 内部逻辑
app.use((req, res) => {
  sessionFunction(req, res);
});

// 启动本地服务器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Local dev server listening on http://localhost:${PORT}`);
  console.log(`Try GET http://localhost:${PORT}/api/session`);
});
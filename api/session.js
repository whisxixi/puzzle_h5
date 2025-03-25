// file: api/session.js

// 1) 引入 Express Router
const express = require('express');
const router = express.Router();

// 2) 定义在本地和 Vercel 都想访问的路由: /api/session
router.get('/api/session', (req, res) => {
  res.json({ msg: 'Hello from unified code' });
});

// 3) Serverless 模式下导出为一个函数
//    当 Vercel 调用 "/api/session" 时，这个函数会被执行
module.exports = (req, res) => {
  return router(req, res);
};
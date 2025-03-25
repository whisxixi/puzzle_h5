// file: api/session.js
const express = require('express');
const app = express();

// 在此定义所有路由，线上线下都共用
app.get('/api/session', (req, res) => {
  res.json({ msg: 'Hello from /api/session' });
});

// 导出给 Vercel 使用
module.exports = (req, res) => {
  return app(req, res);
};
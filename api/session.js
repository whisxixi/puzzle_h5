// file: api/session.js
const express = require('express');
const app = express();

// 在文件加载时的调试输出
console.log("===> session.js loaded <===");

// 定义一个最简单的 GET 路由
app.get('/', (req, res) => {
  console.log("===> Handling GET /api/session");
  res.status(200).json({ message: 'Hello from minimal session.js' });
});

// 双环境兼容：本地 or Vercel
if (require.main === module) {
  // 在本地用 `node api/session.js` 直接启动
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Local session server listening on http://localhost:${PORT}`);
  });
} else {
  // 在 Vercel 上导出 serverless 函数
  module.exports = (req, res) => app(req, res);
}
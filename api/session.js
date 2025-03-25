// const express = require('express');
// const app = express(); // 你必须先定义这个 app
// const uuid = require('uuid');
// const bodyParser = require('body-parser');

// 其他逻辑...

// 最后才是 module.exports
module.exports = (req, res) => {
  console.log('🔥 serverless function 被调用');
  try {
    app(req, res);
  } catch (err) {
    console.error('❌ Serverless 错误:', err);
    res.status(500).json({ error: 'Internal Server Error', detail: err.message });
  }
};
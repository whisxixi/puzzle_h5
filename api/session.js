console.log('===> session.js: top-level code running');

const express = require('express');
const app = express();

app.use((req, res, next) => {
  console.log(`Inside express. req.url = ${req.url}, method=${req.method}`);
  next();
});

app.get('/', (req, res) => {
  console.log('===> session.js: matched GET /');
  res.json({ foo: 'bar' });
});

module.exports = (req, res) => {
  console.log('===> session.js: exports function called');
  return app(req, res);
};
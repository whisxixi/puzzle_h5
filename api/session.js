console.log('===> session.js: before require express');

const express = require('express');
console.log('===> session.js: after require express');

const app = express();
console.log('===> session.js: after app created');

app.get('/', (req, res) => {
  console.log('===> session.js: handling GET /');
  return res.json({ foo: 'bar' });
});

module.exports = (req, res) => {
  console.log('===> session.js: exports function called');
  return app(req, res);
};
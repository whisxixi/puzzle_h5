const express = require('express');
const app = express();

app.get('/', (req, res) => {
  return res.json({ foo: 'bar' });
});

module.exports = (req, res) => app(req, res);
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello from minimal session.js' });
});

module.exports = (req, res) => app(req, res);
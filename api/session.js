const express = require('express');
const app = express();

app.get('/', (req, res) => {
  return res.json({ foo: 'bar' });
});

module.exports = (req, res) => {
  res.status(200).json({ msg: "Serverless function works with express!" });
};
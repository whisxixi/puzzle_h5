const express = require('express');
const app = express();

module.exports = (req, res) => {
  res.status(200).json({ msg: "Serverless function works with express!" });
};
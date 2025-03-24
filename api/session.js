const express = require('express');
const app = express();
const uuid = require('uuid');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const prebuiltImages = require('../imageList.js');

// ✅ 本地 dev 时保留状态
if (!global._sessions) {
  global._sessions = {};
}
const sessions = global._sessions;

app.use(bodyParser.json());


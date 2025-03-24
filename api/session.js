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

// POST /api/session - 创建 session
app.post('/', (req, res) => {
  const sessionId = uuid.v4();
  const imageUrl = getRandomImage();
  const gridRows = 3;
  const gridCols = 3;
  const puzzleProgress = Array(gridRows * gridCols).fill(false);

  sessions[sessionId] = {
    sessionId,
    imageUrl,
    gridRows,
    gridCols,
    puzzleProgress,
    concurrentPlayers: getConcurrentPlayers()
  };

  res.json(sessions[sessionId]);
});

// GET /api/session?id=... - 获取 session

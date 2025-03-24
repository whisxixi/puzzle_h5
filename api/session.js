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
app.get('/', (req, res) => {
  console.log('app.get');
  const sessionId = req.query.id;
  console.log('📦 请求 sessionId:', sessionId);
  console.log('📦 当前所有 sessions:', Object.keys(sessions));
  if (!sessionId) {
    console.warn('⚠️ 没有提供 sessionId');
    return res.status(400).json({ error: 'Missing sessionId' });
  }
  const session = sessions[sessionId];
  if (!session) {
    console.warn('⚠️ 找不到对应的 session');
    return res.status(404).json({ error: 'Session not found' });
  }

  session.concurrentPlayers = getConcurrentPlayers();
  res.json(session);
});

// PUT /api/session?id=... - 更新 session
app.put('/', (req, res) => {
  console.log('app.put');
  const sessionId = req.query.id;
  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { action } = req.body;

  if (action === 'unlockPiece') {
    const locked = session.puzzleProgress
      .map((v, i) => (v ? null : i))
      .filter(i => i !== null);

    if (locked.length > 0) {
      const randIndex = locked[Math.floor(Math.random() * locked.length)];
      session.puzzleProgress[randIndex] = true;
    }

    return res.json(session);

  } else if (action === 'nextImage') {
    if (!session.puzzleProgress.every(Boolean)) {
      return res.json({ message: '拼图未完成', ...session });
    }

    session.imageUrl = getRandomImage();
    session.puzzleProgress = Array(session.gridRows * session.gridCols).fill(false);
    return res.json(session);

  } else if (action === 'resetRound') {
    return res.json(session);
  }

  res.status(400).json({ error: 'Unknown action' });
});

// 获取图片路径
function getRandomImage() {
  console.log('getRandomImage');
  const imagesDir = path.join(__dirname, '../images');
  let files = [];

  try {
    if (fs.existsSync(imagesDir)) {
      files = fs.readdirSync(imagesDir).filter(f => /\.(jpg|png|jpeg)$/i.test(f));
    } else {
      files = prebuiltImages;
    }
  } catch (e) {
    console.error('读取图片失败', e);
    files = prebuiltImages;
  }

  if (files.length === 0) return 'https://via.placeholder.com/300';
  const i = Math.floor(Math.random() * files.length);
  return `/images/${files[i]}`;
}

function getConcurrentPlayers() {
  console.log('getConcurrentPlayers');
  return Math.floor(Math.random() * 100 + 1);
}

// module.exports = app;
module.exports = (req, res) => {
  console.log('module.exports');
  try {
    app(req, res);
  } catch (err) {
    console.error('❌ Express 调用失败:', err);
    res.status(500).json({ error: 'Internal Server Error', detail: err.message });
  }
};
console.log("===> session.js loaded <===");
const express = require('express');
const app = express();
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

let prebuiltImages = [];
try {
  prebuiltImages = require('../imageList.js');
} catch (e) {
  console.error('❌ 无法加载 imageList.js:', e);
}

if (!global._sessions) global._sessions = {};
const sessions = global._sessions;

app.use(bodyParser.json());

// 创建 session
app.post('/', (req, res) => {
  const sessionId = uuidv4();
  const gridRows = 3;
  const gridCols = 3;
  const puzzleProgress = Array(gridRows * gridCols).fill(false);

  sessions[sessionId] = {
    sessionId,
    imageUrl: getRandomImage(),
    gridRows,
    gridCols,
    puzzleProgress,
    concurrentPlayers: getConcurrentPlayers()
  };

  res.json(sessions[sessionId]);
});

// 获取 session
app.get('/', (req, res) => {
  const sessionId = req.query.id;
  const session = sessions[sessionId];

  if (!session) return res.status(404).json({ error: 'Session not found' });

  session.concurrentPlayers = getConcurrentPlayers();
  res.json(session);
});

// 更新 session
app.put('/', (req, res) => {
  const sessionId = req.query.id;
  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { action } = req.body;

  if (action === 'unlockPiece') {
    const locked = session.puzzleProgress
      .map((v, i) => (v ? null : i))
      .filter(i => i !== null);

    if (locked.length > 0) {
      const randIndex = Math.floor(Math.random() * locked.length);
      session.puzzleProgress[locked[randIndex]] = true;
    }

    return res.json(session);
  }

  if (action === 'nextImage') {
    if (!session.puzzleProgress.every(Boolean)) {
      return res.json({ message: '拼图未完成', ...session });
    }
    session.imageUrl = getRandomImage();
    session.puzzleProgress = Array(session.gridRows * session.gridCols).fill(false);
    return res.json(session);
  }

  if (action === 'resetRound') {
    return res.json(session);
  }

  res.status(400).json({ error: 'Unknown action' });
});

// 图片路径
function getRandomImage() {
  if (prebuiltImages.length === 0) return 'https://via.placeholder.com/300';
  const i = Math.floor(Math.random() * prebuiltImages.length);
  return `/images/${prebuiltImages[i]}`;
}

function getConcurrentPlayers() {
  return Math.floor(Math.random() * 100 + 1);
}

// ✅ 双环境兼容导出方式
if (require.main === module) {
  // 👉 本地运行（例如 node server/index.js 引用）
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ 本地 API Server 运行中: http://localhost:${PORT}`);
  });
} else {
  // 👉 Vercel serverless 模式
  module.exports = (req, res) => app(req, res);
}
const express = require('express');
const app = express();
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');

// 全局状态（仅本地有效）
if (!global._sessions) {
  global._sessions = {};
}
const sessions = global._sessions;

app.use(bodyParser.json());

// 创建 session
app.post('/', (req, res) => {
  console.log('📦 收到 POST 请求：创建新 session');
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
  console.log('📦 收到 GET 请求，sessionId:', sessionId);

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  const session = sessions[sessionId];
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.concurrentPlayers = getConcurrentPlayers();
  res.json(session);
});

// 更新 session
app.put('/', (req, res) => {
  const sessionId = req.query.id;
  const session = sessions[sessionId];

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

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

// 随机图片（暂时写死，后面你可以替换回 imageList 逻辑）
function getRandomImage() {
  return '/images/whismiss_a_fantasy_craftsman_creating_a_magical_artifact.png';
}

function getConcurrentPlayers() {
  return Math.floor(Math.random() * 100 + 1);
}

// ✅ 核心！导出 serverless 函数
module.exports = (req, res) => {
  console.log('🔥 Serverless 函数被触发');
  return app(req, res);
};
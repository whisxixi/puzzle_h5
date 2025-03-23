const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const uuid = require('uuid');
const fs = require('fs');
const path = require('path');

app.use(bodyParser.json());
// 设置静态资源目录
app.use(express.static(path.join(__dirname, '../public')));

// 内存存储大局会话数据（生产环境建议使用数据库）
let sessions = {};

// 创建大局会话（图片和拼图进程）
app.post('/api/session', (req, res) => {
  const sessionId = uuid.v4();
  const imageUrl = getRandomImage();
  const gridRows = 3;  // 3×3，共9块
  const gridCols = 3;
  const totalPieces = gridRows * gridCols;
  const puzzleProgress = Array(totalPieces).fill(false);
  sessions[sessionId] = {
    sessionId,
    imageUrl,
    gridRows,
    gridCols,
    puzzleProgress,
    concurrentPlayers: getConcurrentPlayers(sessionId)
  };
  res.json(sessions[sessionId]);
});

// 获取大局数据（共享部分，不涉及小局数据）
app.get('/api/session', (req, res) => {
  const sessionId = req.query.id;
  if (sessions[sessionId]) {
    sessions[sessionId].concurrentPlayers = getConcurrentPlayers(sessionId);
    res.json(sessions[sessionId]);
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

// 更新大局数据，支持三种动作：
// - "unlockPiece"：随机解锁一个未解锁的拼图块
// - "nextImage"：大局拼图全部解锁后，生成新图片，重置拼图进程
// - "resetRound"：仅用于小局重置，直接返回当前大局数据
app.put('/api/session', (req, res) => {
  const sessionId = req.query.id;
  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const { action } = req.body;
  if (action === 'unlockPiece') {
    const lockedIndices = session.puzzleProgress
      .map((v, i) => (v === false ? i : null))
      .filter(v => v !== null);
    if (lockedIndices.length > 0) {
      const randomIndex = lockedIndices[Math.floor(Math.random() * lockedIndices.length)];
      session.puzzleProgress[randomIndex] = true;
    }
    res.json(session);
  } else if (action === 'nextImage') {
    if (!session.puzzleProgress.every(v => v === true)) {
      return res.json({ message: '当前拼图未完成', ...session });
    }
    session.imageUrl = getRandomImage();
    session.puzzleProgress = Array(session.gridRows * session.gridCols).fill(false);
    res.json(session);
  } else if (action === 'resetRound') {
    res.json(session);
  } else {
    res.status(400).json({ error: 'Unknown action' });
  }
});

// 辅助函数：从 public/images 目录随机选取一张图片
function getRandomImage() {
  const imagesDir = path.join(__dirname, '../public/images');
  let imageFiles = [];
  try {
    imageFiles = fs.readdirSync(imagesDir).filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
  } catch (err) {
    console.error('读取 images 文件夹失败:', err);
  }
  if (imageFiles.length === 0) return 'https://via.placeholder.com/300';
  const randomIndex = Math.floor(Math.random() * imageFiles.length);
  return `/images/${imageFiles[randomIndex]}`;
}

// 模拟在线人数
function getConcurrentPlayers(sessionId) {
  return Math.floor(Math.random() * 100) + 1;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
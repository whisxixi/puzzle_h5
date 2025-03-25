// file: api/session.js
console.log("===> session.js loaded <===");

const express = require('express');
const app = express();
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const prebuiltImages = require('../imageList.js');

// 在本地或Vercel都可用的“内存型” sessions
if (!global._sessions) {
  global._sessions = {};
}
const sessions = global._sessions;

app.use(bodyParser.json());

// ================= 路由逻辑 ================
// 由于本地通过 /api/session 进来后，会把子路径剥离成 "/"，
// 在 Vercel 我们会手动做剥离(见最底部module.exports)，
// 所以这里写在 '/' 上即可。
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

app.get('/', (req, res) => {
  const sessionId = req.query.id;
  const session = sessions[sessionId];
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  session.concurrentPlayers = getConcurrentPlayers();
  res.json(session);
});

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

// ============== 辅助函数 ==============
function getRandomImage() {
  // 先尝试读取 /images 文件夹
  const imagesDir = path.join(__dirname, '../images');
  let files = [];
  try {
    if (fs.existsSync(imagesDir)) {
      files = fs.readdirSync(imagesDir)
        .filter(f => /\.(jpg|png|jpeg)$/i.test(f));
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
  return Math.floor(Math.random() * 100 + 1);
}

// ============== 导出给本地 / Vercel 使用 ==============
module.exports = (req, res) => {
  // 这句确保在 Vercel 环境下，如果 req.url 是 "/api/session" 或 "/api/session?..."
  // 我们把它替换为 "/" 继续给 app 匹配
  if (req.url.startsWith('/api/session')) {
    // 去掉 "/api/session" 前缀
    req.url = req.url.replace(/^\/api\/session/, '');
    // 如果结果是空字符串，则改成 '/'
    if (!req.url.startsWith('/')) {
      req.url = '/' + req.url;
    }
    if (req.url === '') {
      req.url = '/';
    }
    console.log('===> Rewritten req.url =', req.url);
  }

  return app(req, res);
};
// server/index.js
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const uuid = require('uuid');
const fs = require('fs');
const path = require('path');

app.use(bodyParser.json());
// 设置静态文件目录
app.use(express.static(path.join(__dirname, '../public')));

// 加载词库，每行一个单词，转换为大写
const dictionaryFile = path.join(__dirname, '../words.txt');
let dictionaryWords = [];
try {
  const data = fs.readFileSync(dictionaryFile, 'utf-8');
  dictionaryWords = data.split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .map(word => word.trim().toUpperCase());
  console.log(`加载词库，单词数：${dictionaryWords.length}`);
} catch (err) {
  console.error('加载词库失败:', err);
}

// 内存存储会话数据（生产环境建议使用数据库）
let sessions = {};

// 创建新会话
app.post('/api/session', (req, res) => {
  const sessionId = uuid.v4();
  // 从本地 public/images 文件夹中随机选择一张图片
  const imageUrl = getRandomImage();
  const gridRows = 4;
  const gridCols = 4;
  const totalPieces = gridRows * gridCols;
  const puzzleProgress = Array(totalPieces).fill(false);
  // 随机选择目标单词
  const targetWord = dictionaryWords[Math.floor(Math.random() * dictionaryWords.length)];
  sessions[sessionId] = {
    sessionId,
    imageUrl,
    gridRows,
    gridCols,
    puzzleProgress,
    targetWord,
    attempts: [],       // 猜测记录
    maxAttempts: 6,
    gameStatus: 'playing', // playing / won / lost
    concurrentPlayers: 1  // 初始在线人数
  };
  res.json(sessions[sessionId]);
});

// 获取会话数据
app.get('/api/session', (req, res) => {
  const sessionId = req.query.id;
  if (sessions[sessionId]) {
    sessions[sessionId].concurrentPlayers = getConcurrentPlayers(sessionId);
    // 注意：这里为了方便前端显示谜底，返回时总是包含 targetWord
    res.json(sessions[sessionId]);
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

// 更新会话数据
app.put('/api/session', (req, res) => {
  const sessionId = req.query.id;
  const session = sessions[sessionId];
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const { action, guess } = req.body;
  if (action === 'guessWord') {
    const userGuess = guess.trim().toUpperCase();
    if (userGuess.length !== session.targetWord.length) {
      return res.json({
        valid: false,
        message: `单词长度必须为 ${session.targetWord.length} 个字母`,
        ...session
      });
    }
    if (!dictionaryWords.includes(userGuess)) {
      return res.json({
        valid: false,
        message: "该单词不在词库中",
        ...session
      });
    }
    if (session.gameStatus !== 'playing') {
      return res.json({ message: "游戏已经结束", ...session });
    }
    const feedback = getFeedback(userGuess, session.targetWord);
    session.attempts.push({ guess: userGuess, feedback });
    // 只有当用户猜对时解锁一块拼图
    if (userGuess === session.targetWord) {
      const idx = session.puzzleProgress.findIndex(piece => piece === false);
      if (idx !== -1) {
        session.puzzleProgress[idx] = true;
      }
      session.gameStatus = 'won';
    } else if (session.attempts.length >= session.maxAttempts) {
      session.gameStatus = 'lost';
    }
    res.json({
      valid: true,
      guess: userGuess,
      feedback,
      gameStatus: session.gameStatus,
      attempts: session.attempts,
      puzzleProgress: session.puzzleProgress,
      concurrentPlayers: getConcurrentPlayers(sessionId),
      targetWord: session.targetWord
    });
  } else if (action === 'resetRound') {
    // “继续挑战下一块”：仅在上一轮结束后有效
    if (session.gameStatus === 'playing') {
      return res.json({ message: "当前游戏仍在进行中", ...session });
    }
    // 重置猜测记录和游戏状态，重新选择一个目标单词（保持当前拼图进程不变）
    session.attempts = [];
    session.gameStatus = 'playing';
    session.targetWord = dictionaryWords[Math.floor(Math.random() * dictionaryWords.length)];
    res.json(session);
  } else {
    res.status(400).json({ error: 'Unknown action' });
  }
});

// 获取随机图片 URL，从本地 public/images 文件夹中读取
function getRandomImage() {
  const imagesDir = path.join(__dirname, '../public/images');
  let imageFiles = [];
  try {
    imageFiles = fs.readdirSync(imagesDir).filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
  } catch (err) {
    console.error('读取 images 文件夹失败:', err);
  }
  if (imageFiles.length === 0) {
    return 'https://via.placeholder.com/300';
  }
  const randomIndex = Math.floor(Math.random() * imageFiles.length);
  return `/images/${imageFiles[randomIndex]}`;
}

// 计算反馈（emoji 方式）
function getFeedback(guess, target) {
  guess = guess.toUpperCase();
  target = target.toUpperCase();
  let feedback = Array(guess.length).fill('⬜');
  let targetLetters = target.split('');
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === target[i]) {
      feedback[i] = '🟩';
      targetLetters[i] = null;
    }
  }
  for (let i = 0; i < guess.length; i++) {
    if (feedback[i] !== '🟩') {
      const index = targetLetters.indexOf(guess[i]);
      if (index !== -1) {
        feedback[i] = '🟨';
        targetLetters[index] = null;
      }
    }
  }
  return feedback.join('');
}

function getConcurrentPlayers(sessionId) {
  return Math.floor(Math.random() * 100) + 1;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
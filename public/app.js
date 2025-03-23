// 定义全局变量，保存当前拼图进程和会话基本信息
let currentPuzzleProgress = [];
let currentSession = null; // 保存图片 URL、行数、列数及谜底单词

document.addEventListener('DOMContentLoaded', () => {
  let sessionId;
  const urlParams = new URLSearchParams(window.location.search);
  sessionId = urlParams.get('session');

  if (!sessionId) {
    createNewSession().then(newSession => {
      sessionId = newSession.sessionId;
      window.history.replaceState({}, '', `?session=${sessionId}`);
      initGame(newSession);
    });
  } else {
    fetchSession(sessionId).then(sessionData => {
      initGame(sessionData);
    });
  }

  // 表单提交事件，防止刷新
  document.getElementById('wordle-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('wordle-input');
    const guess = input.value.trim();
    if (guess) {
      submitGuess(sessionId, guess);
      input.value = '';
    }
  });

  // 分享按钮
  document.getElementById('share-button').addEventListener('click', () => {
    shareSession(sessionId);
  });

  // “继续挑战下一块”按钮事件
  document.getElementById('restart-button').addEventListener('click', () => {
    resetRound(sessionId);
  });

  // 定时更新猜测记录和在线人数；拼图区域仅在游戏结束后平滑更新新增的块
  setInterval(() => {
    updateSession(sessionId);
  }, 5000);
});

// 创建新会话
function createNewSession() {
  return fetch('/api/session', { method: 'POST' })
    .then(res => res.json());
}

// 获取会话数据
function fetchSession(sessionId) {
  return fetch(`/api/session?id=${sessionId}`)
    .then(res => res.json());
}

// 初始化游戏：渲染谜底、猜测历史、拼图区域初次显示及在线人数
function initGame(sessionData) {
  currentSession = {
    imageUrl: sessionData.imageUrl,
    gridRows: sessionData.gridRows,
    gridCols: sessionData.gridCols,
    targetWord: sessionData.targetWord
  };
  updateSecretWordDisplay(currentSession.targetWord);
  currentPuzzleProgress = sessionData.puzzleProgress.slice();
  renderAttempts(sessionData);
  updateConcurrentPlayers(sessionData.concurrentPlayers);
  renderPuzzleInitial(sessionData);
}

// 更新谜底显示区域
function updateSecretWordDisplay(word) {
  document.getElementById('secret-word-display').innerText = `当前谜底：${word}`;
}

// 初次渲染拼图区域：为每个块创建 DOM，并记录索引
function renderPuzzleInitial(sessionData) {
  const container = document.getElementById('puzzle-container');
  container.innerHTML = '';
  const rows = sessionData.gridRows;
  const cols = sessionData.gridCols;
  const totalPieces = rows * cols;
  for (let i = 0; i < totalPieces; i++) {
    const piece = document.createElement('div');
    piece.classList.add('puzzle-piece');
    piece.dataset.index = i;
    if (sessionData.puzzleProgress[i]) {
      setPieceImage(piece, i);
    } else {
      piece.style.backgroundColor = '#ccc';
    }
    container.appendChild(piece);
  }
}

// 设置某个拼图块显示图片部分
function setPieceImage(piece, index) {
  const cols = currentSession.gridCols;
  const rows = currentSession.gridRows;
  const col = index % cols;
  const row = Math.floor(index / cols);
  piece.style.backgroundImage = `url(${currentSession.imageUrl})`;
  piece.style.backgroundPosition = `-${col * 100}% -${row * 100}%`;
  piece.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
}

// 渲染猜测历史记录
function renderAttempts(sessionData) {
  const board = document.getElementById('wordle-board');
  board.innerHTML = '';
  if (sessionData.attempts && sessionData.attempts.length > 0) {
    sessionData.attempts.forEach(item => {
      const div = document.createElement('div');
      div.innerText = `${item.guess}   ${item.feedback}`;
      board.appendChild(div);
    });
  }
}

// 更新在线人数显示
function updateConcurrentPlayers(count) {
  document.getElementById('concurrent-count').innerText = `${count} 人也在同时玩`;
}

// 提交猜测
function submitGuess(sessionId, guess) {
  fetch(`/api/session?id=${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'guessWord', guess: guess })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.valid && data.message) {
        alert(data.message);
      }
      renderAttempts(data);
      updateConcurrentPlayers(data.concurrentPlayers);
      if (data.gameStatus === 'playing') {
        return;
      } else {
        updatePuzzleAfterGameEnd(data);
        if (data.gameStatus === 'won') {
          alert(`恭喜！你猜对了单词 ${data.guess}！`);
        } else if (data.gameStatus === 'lost') {
          alert(`游戏结束！正确单词为 ${data.targetWord}`);
        }
        // 显示“继续挑战下一块”按钮
        document.getElementById('restart-button').style.display = 'block';
      }
    })
    .catch(err => {
      console.error('提交猜测失败：', err);
    });
}

// 通过 resetRound 动作重置当前会话中的猜词状态（不改变拼图进程）
function resetRound(sessionId) {
  fetch(`/api/session?id=${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'resetRound' })
  })
    .then(res => res.json())
    .then(data => {
      // 更新谜底显示及猜测历史和在线人数
      currentSession.targetWord = data.targetWord;
      updateSecretWordDisplay(data.targetWord);
      renderAttempts(data);
      updateConcurrentPlayers(data.concurrentPlayers);
      // 隐藏按钮
      document.getElementById('restart-button').style.display = 'none';
    })
    .catch(err => {
      console.error('重置游戏状态失败：', err);
    });
}

// 定时更新会话数据（仅更新猜测记录和在线人数；拼图区域仅在游戏结束后更新新增块）
function updateSession(sessionId) {
  fetchSession(sessionId).then(sessionData => {
    renderAttempts(sessionData);
    updateConcurrentPlayers(sessionData.concurrentPlayers);
    if (sessionData.gameStatus !== 'playing') {
      updatePuzzleAfterGameEnd(sessionData);
    }
  });
}

// 更新拼图区域：对比新返回的 puzzleProgress 与当前状态，平滑动画更新新增解锁的块
function updatePuzzleAfterGameEnd(newData) {
  const newProgress = newData.puzzleProgress;
  newProgress.forEach((unlocked, index) => {
    if (unlocked && !currentPuzzleProgress[index]) {
      const piece = document.querySelector(`.puzzle-piece[data-index="${index}"]`);
      if (piece) {
        setPieceImage(piece, index);
        piece.classList.add('reveal');
      }
    }
  });
  currentPuzzleProgress = newProgress.slice();
}

// 分享当前会话链接
function shareSession(sessionId) {
  const shareUrl = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
  if (navigator.share) {
    navigator.share({
      title: '拼图 Wordle 游戏',
      text: '快来和我一起玩拼图和单词猜测游戏！',
      url: shareUrl
    })
      .then(() => console.log('分享成功'))
      .catch(err => console.error('分享失败：', err));
  } else {
    prompt('复制链接分享给朋友：', shareUrl);
  }
}
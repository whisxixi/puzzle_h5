// 全局变量：保存当前拼图进程和会话基本信息
let currentPuzzleProgress = [];
let currentSession = null; // 保存 imageUrl、gridRows、gridCols、targetWord

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

  // 表单提交事件：如果出现“继续下一块拼图”按钮（即重置区域显示），则按回车视为点击重置按钮
  document.getElementById('wordle-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const resetContainer = document.getElementById('reset-container');
    if (resetContainer.style.display === 'block' &&
        document.getElementById('reset-button').style.display !== 'none') {
      // 当前显示重置按钮，回车即触发 resetRound
      resetRound(sessionId);
    } else {
      // 否则，按正常提交猜词
      const input = document.getElementById('wordle-input');
      const guess = input.value.trim();
      if (guess) {
        submitGuess(sessionId, guess);
        input.value = '';
      }
    }
  });

  // 分享按钮
  document.getElementById('share-button').addEventListener('click', () => {
    shareSession(sessionId);
  });

  // “继续下一块拼图”按钮点击事件
  document.getElementById('reset-button').addEventListener('click', () => {
    resetRound(sessionId);
  });

  // 定时更新猜测记录和在线人数；拼图区域仅在游戏结束后平滑更新新增块
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

// 初始化游戏：设置当前会话、更新谜底、渲染猜测历史、拼图区域及在线人数，调整拼图容器尺寸
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
  updatePuzzleContainerSize();
  // 清空并隐藏中间重置区域
  updateResetPrompt('');
  document.getElementById('reset-container').style.display = 'none';
}

// 更新谜底显示（左侧）
function updateSecretWordDisplay(word) {
  document.getElementById('secret-word-display').innerText = `当前谜底：${word}`;
}

// 初次渲染拼图区域：为每个拼图块生成 DOM，并记录索引
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

// 根据要求调整拼图容器尺寸：高度固定为视口高度的70%，宽度根据原图比例计算
function updatePuzzleContainerSize() {
  const container = document.getElementById('puzzle-container');
  const containerHeight = window.innerHeight * 0.7;
  const img = new Image();
  img.src = currentSession.imageUrl;
  img.onload = () => {
    const ratio = img.naturalWidth / img.naturalHeight; // 原图宽高比
    const containerWidth = containerHeight * ratio;
    container.style.height = `${containerHeight}px`;
    container.style.width = `${containerWidth}px`;
  };
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
      // 若提交无效（如单词长度错误或不在词库中），显示临时提示（不改变游戏状态）
      if (!data.valid && data.message) {
        showTemporaryMessage(data.message);
        renderAttempts(data);
        updateConcurrentPlayers(data.concurrentPlayers);
        return;
      }
      renderAttempts(data);
      updateConcurrentPlayers(data.concurrentPlayers);
      if (data.gameStatus === 'playing') {
        // 游戏进行中，无需提示重置区域
        return;
      } else {
        // 游戏结束后，平滑更新新增解锁的拼图块
        updatePuzzleAfterGameEnd(data);
        let msg = '';
        if (data.gameStatus === 'won') {
          msg = `恭喜！你猜对了单词 ${data.guess}！`;
        } else if (data.gameStatus === 'lost') {
          msg = `游戏结束！正确单词为 ${data.targetWord}！`;
        }
        // 显示游戏结束提示，然后在2秒后淡出提示并显示“继续下一块拼图”按钮
        showResetPrompt(msg);
      }
    })
    .catch(err => {
      console.error('提交猜测失败：', err);
    });
}

// 显示临时提示（适用于无效猜测提示），2秒后自动清除
function showTemporaryMessage(message) {
  const resetContainer = document.getElementById('reset-container');
  const resetPrompt = document.getElementById('reset-prompt');
  // 显示临时提示，不显示按钮
  resetContainer.style.display = 'block';
  resetPrompt.innerText = message;
  document.getElementById('reset-button').style.display = 'none';
  setTimeout(() => {
    resetPrompt.innerText = '';
    resetContainer.style.display = 'none';
  }, 2000);
}

// 显示重置提示（游戏结束提示）：先显示提示2秒后淡出提示、显示按钮
function showResetPrompt(message) {
  const resetContainer = document.getElementById('reset-container');
  const resetPrompt = document.getElementById('reset-prompt');
  const resetButton = document.getElementById('reset-button');
  resetContainer.style.display = 'block';
  resetPrompt.innerText = message;
  resetPrompt.style.opacity = '1';
  resetButton.style.display = 'none';
  // 2秒后淡出提示文字
  setTimeout(() => {
    resetPrompt.style.transition = 'opacity 1s';
    resetPrompt.style.opacity = '0';
    setTimeout(() => {
      resetPrompt.innerText = '';
      resetPrompt.style.opacity = '1';
      resetButton.style.display = 'inline-block';
    }, 1000);
  }, 2000);
}

// 重置当前回合（继续挑战下一块）：在当前会话中仅重置猜测状态和目标单词，不改变拼图进程
function resetRound(sessionId) {
  fetch(`/api/session?id=${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'resetRound' })
  })
    .then(res => res.json())
    .then(data => {
      currentSession.targetWord = data.targetWord;
      updateSecretWordDisplay(data.targetWord);
      renderAttempts(data);
      updateConcurrentPlayers(data.concurrentPlayers);
      // 清空重置区域
      document.getElementById('reset-prompt').innerText = '';
      document.getElementById('reset-container').style.display = 'none';
    })
    .catch(err => {
      console.error('重置游戏状态失败：', err);
    });
}

// 定时更新会话数据（更新猜测记录和在线人数；游戏结束后平滑更新新增拼图块）
function updateSession(sessionId) {
  fetchSession(sessionId).then(sessionData => {
    renderAttempts(sessionData);
    updateConcurrentPlayers(sessionData.concurrentPlayers);
    if (sessionData.gameStatus !== 'playing') {
      updatePuzzleAfterGameEnd(sessionData);
    }
  });
}

// 平滑更新拼图区域：对比新返回的 puzzleProgress 与当前状态，找出新增解锁的拼图块并加动画
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
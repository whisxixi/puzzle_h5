// 全局变量：大局数据由服务器管理，小局数据由客户端独立管理
let currentPuzzleProgress = [];
let currentSession = null; // 包含 imageUrl, gridRows, gridCols
let localTargetWord = '';  // 玩家独立小局目标单词
let localAttempts = [];
const localMaxAttempts = 6;
let localDictionary = [];  // 单词库从 words.txt 加载

// 新增全局变量，表示是否大局已完成（允许重置按钮）
let resetActive = false;

// 加载本地词库，从 public/words.txt 获取
function loadLocalDictionary() {
  return fetch('words.txt')
    .then(res => res.text())
    .then(text => {
      localDictionary = text.split(/\r?\n/)
        .filter(line => line.trim().length > 0)
        .map(word => word.trim().toUpperCase());
    });
}

document.addEventListener('DOMContentLoaded', () => {
  // 先加载词库，再初始化游戏
  loadLocalDictionary().then(() => {
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

    // 表单提交：若重置按钮显示（resetActive为true），则回车触发重置；否则提交小局猜测
    document.getElementById('wordle-form').addEventListener('submit', (event) => {
      event.preventDefault();
      if (resetActive) {
        const btnText = document.getElementById('reset-button').innerText;
        if (btnText === '继续揭秘下一张') {
          nextImage(sessionId);
        } else {
          resetLocalRound();
        }
        return;
      }
      submitLocalGuess(sessionId);
    });

    // Twitter 分享按钮
    document.getElementById('share-button').addEventListener('click', () => {
      shareSession(sessionId);
    });

    // “继续下一块拼图”/“继续揭秘下一张”按钮点击事件
    document.getElementById('reset-button').addEventListener('click', () => {
      if (document.getElementById('reset-button').innerText === '继续揭秘下一张') {
        nextImage(sessionId);
      } else {
        resetLocalRound();
      }
    });

    // 定时更新大局数据（共享拼图进程和在线人数）
    setInterval(() => {
      updateSession(sessionId);
    }, 5000);
  });
});

// --- 大局部分（服务器管理） ---
function createNewSession() {
  return fetch('/api/session', { method: 'POST' })
    .then(res => res.json());
}
function fetchSession(sessionId) {
  return fetch(`/api/session?id=${sessionId}`)
    .then(res => res.json());
}
function initGame(sessionData) {
  currentSession = {
    imageUrl: sessionData.imageUrl,
    gridRows: sessionData.gridRows,
    gridCols: sessionData.gridCols
  };
  currentPuzzleProgress = sessionData.puzzleProgress.slice();
  renderPuzzleInitial(sessionData);
  updatePuzzleContainerSize();
  updateConcurrentPlayers(sessionData.concurrentPlayers);
  // 初始化小局：生成新的目标单词并清空记录
  resetLocalGame();
  updateSecretWordDisplay(localTargetWord);
  updateResetPrompt('');
  document.getElementById('reset-container').style.display = 'none';
  resetActive = false;
}
function renderPuzzleInitial(sessionData) {
  const container = document.getElementById('puzzle-container');
  container.innerHTML = '';
  const rows = sessionData.gridRows;
  const cols = sessionData.gridCols;
  const totalPieces = rows * cols;
  const jigsawClasses = ['jigsaw-1', 'jigsaw-2', 'jigsaw-3'];
  for (let i = 0; i < totalPieces; i++) {
    const piece = document.createElement('div');
    piece.classList.add('puzzle-piece');
    piece.classList.add(jigsawClasses[Math.floor(Math.random() * jigsawClasses.length)]);
    piece.dataset.index = i;
    if (sessionData.puzzleProgress[i]) {
      setPieceImage(piece, i);
    } else {
      piece.style.backgroundColor = '#ccc';
    }
    container.appendChild(piece);
  }
}
function updatePuzzleContainerSize() {
  const container = document.getElementById('puzzle-container');
  const containerHeight = window.innerHeight * 0.7;
  const img = new Image();
  img.src = currentSession.imageUrl;
  img.onload = () => {
    const ratio = img.naturalWidth / img.naturalHeight;
    const containerWidth = containerHeight * ratio;
    container.style.height = `${containerHeight}px`;
    container.style.width = `${containerWidth}px`;
  };
}
function setPieceImage(piece, index) {
  const cols = currentSession.gridCols;
  const rows = currentSession.gridRows;
  const col = index % cols;
  const row = Math.floor(index / cols);
  piece.style.backgroundImage = `url(${currentSession.imageUrl})`;
  piece.style.backgroundPosition = `-${col * 100}% -${row * 100}%`;
  piece.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
}
function updateConcurrentPlayers(count) {
  document.getElementById('concurrent-count').innerText = `${count} 人也在同时玩`;
}
function updateSession(sessionId) {
  fetchSession(sessionId).then(sessionData => {
    updateConcurrentPlayers(sessionData.concurrentPlayers);
    if (sessionData.puzzleProgress) {
      updatePuzzleAfterGameEnd(sessionData);
      currentPuzzleProgress = sessionData.puzzleProgress.slice();
    }
  });
}
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
}

// 当小局猜对后调用此函数：调用大局接口解锁拼图，并显示提示和操作按钮
function unlockPiece(sessionId) {
  fetch(`/api/session?id=${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'unlockPiece' })
  })
    .then(res => res.json())
    .then(data => {
      updateConcurrentPlayers(data.concurrentPlayers);
      updatePuzzleAfterGameEnd(data);
      currentPuzzleProgress = data.puzzleProgress.slice();
      if (data.puzzleProgress.every(v => v === true)) {
        showResetPrompt('恭喜你已获得完整图片！', '继续揭秘下一张');
      } else {
        showResetPrompt('恭喜！你猜对了！', '继续挑战下一块拼图');
      }
    })
    .catch(err => console.error('解锁拼图失败：', err));
}

// --- 小局部分（客户端独立） ---
// 重置小局状态：从 words.txt 加载的词库中随机选取目标单词，并清空本地记录
function resetLocalGame() {
  localTargetWord = localDictionary[Math.floor(Math.random() * localDictionary.length)];
  localAttempts = [];
  document.getElementById('wordle-board').innerHTML = '';
}
// 更新左侧显示为玩家自己的目标单词
function updateSecretWordDisplay(word) {
  document.getElementById('secret-word-display').innerText = `当前谜底：${word}`;
}
// 提交小局猜测
function submitLocalGuess(sessionId) {
  const input = document.getElementById('wordle-input');
  const guess = input.value.trim().toUpperCase();
  input.value = ''; // 每次提交后自动清空输入框
  if (!guess) return;
  if (guess.length !== localTargetWord.length) {
    showTemporaryMessage(`单词长度应为 ${localTargetWord.length}`);
    return;
  }
  if (!localDictionary.includes(guess)) {
    showTemporaryMessage('该单词不在词库中');
    return;
  }
  localAttempts.push(guess);
  const feedback = getLocalFeedback(guess, localTargetWord);
  appendLocalAttempt(`${guess}   ${feedback}`);
  if (guess === localTargetWord) {
    unlockPiece(sessionId);
    // 小局状态暂不自动重置，等待用户点击“继续挑战下一块拼图”或回车触发 resetLocalRound
  } else if (localAttempts.length >= localMaxAttempts) {
    showTemporaryMessage(`本局失败，正确单词是 ${localTargetWord}`);
    resetLocalGame();
    updateSecretWordDisplay(localTargetWord);
  }
}
function getLocalFeedback(guess, target) {
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
      const idx = targetLetters.indexOf(guess[i]);
      if (idx !== -1) {
        feedback[i] = '🟨';
        targetLetters[idx] = null;
      }
    }
  }
  return feedback.join('');
}
function appendLocalAttempt(text) {
  const board = document.getElementById('wordle-board');
  const div = document.createElement('div');
  div.innerText = text;
  board.appendChild(div);
}

// --- 提示与重置区域 ---
// 显示临时提示（无效猜测等），2秒后自动清除
function showTemporaryMessage(message) {
  const resetContainer = document.getElementById('reset-container');
  const resetPrompt = document.getElementById('reset-prompt');
  resetContainer.style.display = 'block';
  resetPrompt.innerText = message;
  document.getElementById('reset-button').style.display = 'none';
  setTimeout(() => {
    resetPrompt.innerText = '';
    resetContainer.style.display = 'none';
  }, 2000);
}
function updateResetPrompt(text) {
  document.getElementById('reset-prompt').innerText = text;
}
// 显示重置提示（小局结束提示）：提示显示2秒后淡出，再显示按钮，并激活重置操作
function showResetPrompt(message, btnText) {
  resetActive = true;
  const resetContainer = document.getElementById('reset-container');
  const resetPrompt = document.getElementById('reset-prompt');
  const resetButton = document.getElementById('reset-button');
  resetContainer.style.display = 'block';
  resetPrompt.innerText = message;
  resetPrompt.style.opacity = '1';
  resetButton.style.display = 'none';
  setTimeout(() => {
    resetPrompt.style.transition = 'opacity 1s';
    resetPrompt.style.opacity = '0';
    setTimeout(() => {
      resetPrompt.innerText = '';
      resetPrompt.style.opacity = '1';
      resetButton.innerText = btnText;
      resetButton.style.display = 'inline-block';
    }, 1000);
  }, 2000);
}
// 重置本地小局（继续挑战下一块）：清空本地记录，生成新目标单词，并更新显示，不更改大局拼图记录
function resetLocalRound() {
  resetLocalGame();
  updateSecretWordDisplay(localTargetWord);
  document.getElementById('wordle-board').innerHTML = '';
  document.getElementById('reset-prompt').innerText = '';
  document.getElementById('reset-container').style.display = 'none';
  resetActive = false;
}

// --- 大局重置操作 ---
// 小局重置（继续挑战下一块拼图）：调用大局接口 resetRound，仅返回当前大局数据；小局则重置
function resetRound(sessionId) {
  fetch(`/api/session?id=${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'resetRound' })
  })
    .then(res => res.json())
    .then(data => {
      resetLocalRound();
    })
    .catch(err => console.error('重置小局失败：', err));
}
// 切换大局（继续揭秘下一张）：调用 nextImage 接口，更新大局数据，同时重置小局
function nextImage(sessionId) {
  fetch(`/api/session?id=${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'nextImage' })
  })
    .then(res => res.json())
    .then(data => {
      currentSession.imageUrl = data.imageUrl;
      currentPuzzleProgress = data.puzzleProgress.slice();
      renderPuzzleInitial(data);
      updatePuzzleContainerSize();
      resetLocalRound();
      updateSecretWordDisplay(localTargetWord);
    })
    .catch(err => console.error('切换大局失败：', err));
}

// --- 分享 ---
// 调用 Twitter 分享，生成链接并打开新窗口
function shareSession(sessionId) {
  const shareUrl = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('快来一起挑战拼图 Wordle 游戏！')}&url=${encodeURIComponent(shareUrl)}`;
  window.open(twitterUrl, '_blank');
}

// --- 加载单词库 ---
// 从 public/words.txt 加载单词库，生成 localDictionary 数组
function loadLocalDictionary() {
  return fetch('words.txt')
    .then(res => res.text())
    .then(text => {
      localDictionary = text.split(/\r?\n/)
        .filter(line => line.trim().length > 0)
        .map(word => word.trim().toUpperCase());
    });
}

// 在 DOMContentLoaded 时先加载单词库
document.addEventListener('DOMContentLoaded', () => {
  loadLocalDictionary().then(() => {
    console.log('词库加载完成，共 ' + localDictionary.length + ' 个单词');
  });
});
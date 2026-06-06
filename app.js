/* ==========================================================================
   APP STATE & INITIALIZATION
   ========================================================================== */
let quizMode = 'training'; // 'training' | 'exam'
let activeCategory = 'all'; // 'all' | 'general' | 'ai' | 'practical'
let filteredQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let userAnswers = []; // Array of { questionId, selectedIndex, correct }
let isSoundEnabled = true;
let timerInterval = null;
let timeLeft = 25 * 60; // 25 minutes in seconds
let quizStartTime = 0;
let totalTimeTaken = 0;
let failedQuestionIds = [];
let activeStudyCategory = 'all';

// Web Audio API Context for synthesized sound effects
let audioCtx = null;

// DOM Elements Cache
const DOM = {
  themeToggle: document.getElementById('theme-toggle'),
  soundToggle: document.getElementById('sound-toggle'),
  startScreen: document.getElementById('start-screen'),
  quizScreen: document.getElementById('quiz-screen'),
  resultsScreen: document.getElementById('results-screen'),
  startQuizBtn: document.getElementById('start-quiz-btn'),
  quitQuizBtn: document.getElementById('quit-quiz-btn'),
  nextQBtn: document.getElementById('next-q-btn'),
  restartQuizBtn: document.getElementById('restart-quiz-btn'),
  retryFailedBtn: document.getElementById('retry-failed-btn'),
  homeBtn: document.getElementById('home-btn'),
  studyModeBtn: document.getElementById('study-mode-btn'),
  studyScreen: document.getElementById('study-screen'),
  studyQuestionsList: document.getElementById('study-questions-list'),
  studySearchInput: document.getElementById('study-search-input'),
  studyBackBtn: document.getElementById('study-back-btn'),
  
  // Quiz HUD
  categoryBadge: document.getElementById('category-badge'),
  currentQNum: document.getElementById('current-q-num'),
  totalQNum: document.getElementById('total-q-num'),
  examTimer: document.getElementById('exam-timer'),
  timeLeftText: document.getElementById('time-left'),
  progressBar: document.getElementById('quiz-progress'),
  
  // Quiz Content
  questionText: document.getElementById('question-text'),
  optionsGrid: document.getElementById('options-grid'),
  explanationBox: document.getElementById('explanation-box'),
  explanationText: document.getElementById('explanation-text'),
  feedbackText: document.getElementById('feedback-text'),
  feedbackIcon: document.getElementById('feedback-icon'),
  overrideCorrectBtn: document.getElementById('override-correct-btn'),
  
  // Results
  scorePercent: document.getElementById('score-percent'),
  scoreFraction: document.getElementById('score-fraction'),
  scoreVerdict: document.getElementById('score-verdict'),
  radialBar: document.getElementById('radial-bar'),
  resultMode: document.getElementById('result-mode'),
  resultCategory: document.getElementById('result-category'),
  resultTime: document.getElementById('result-time'),
  resultCorrect: document.getElementById('result-correct'),
  resultWrong: document.getElementById('result-wrong'),
  wrongAnswersList: document.getElementById('wrong-answers-list'),

  // Custom Confirm Modal
  confirmModal: document.getElementById('confirm-modal'),
  confirmOkBtn: document.getElementById('confirm-ok-btn'),
  confirmCancelBtn: document.getElementById('confirm-cancel-btn'),

  // AI Oral Exam Components
  aiWriteContainer: document.getElementById('ai-write-container'),
  aiUserAnswer: document.getElementById('ai-user-answer'),
  aiCheckBtn: document.getElementById('ai-check-btn'),
  aiLoadingBox: document.getElementById('ai-loading-box'),
  aiResultBox: document.getElementById('ai-result-box'),
  aiScoreValue: document.getElementById('ai-score-value'),
  aiVerdictBadge: document.getElementById('ai-verdict-badge'),
  aiCorrectText: document.getElementById('ai-correct-text'),
  aiMissingText: document.getElementById('ai-missing-text'),
  aiCommentText: document.getElementById('ai-comment-text'),
  toggleAcademicBtn: document.getElementById('toggle-academic-btn'),
  academicAnswerBox: document.getElementById('academic-answer-box'),
  academicAnswerText: document.getElementById('academic-answer-text'),

  // Quiz Ask AI panel
  quizAskAiPanel: document.getElementById('quiz-ask-ai-panel'),
  quizAskAiToggle: document.getElementById('quiz-ask-ai-toggle'),
  quizAskAiArrow: document.getElementById('quiz-ask-ai-arrow'),
  quizAskAiBody: document.getElementById('quiz-ask-ai-body'),
  quizAiInput: document.getElementById('quiz-ai-input'),
  quizAiSendBtn: document.getElementById('quiz-ai-send-btn'),
  quizAiLoading: document.getElementById('quiz-ai-loading'),
  quizAiResponse: document.getElementById('quiz-ai-response')
};

// Start Setup
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
});

/* ==========================================================================
   SOUND CONTROLLER (Web Audio API Synthesizer)
   ========================================================================== */
function initAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  } catch (e) {
    console.warn("Web Audio API not supported or blocked by browser policies:", e);
    isSoundEnabled = false;
  }
}

function playSound(type) {
  if (!isSoundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'click') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.2);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.25);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.15);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'victory') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(783.99, now + 0.12);
      osc.frequency.setValueAtTime(1046.50, now + 0.24);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.4);
      gain.gain.linearRampToValueAtTime(0, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.55);
    }
  } catch (e) {
    console.warn("Failed to play sound: ", e);
  }
}

/* ==========================================================================
   EVENT LISTENERS & NAVIGATION
   ========================================================================== */
function initEventListeners() {
  // Theme Toggle
  DOM.themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    DOM.themeToggle.querySelector('.btn-icon').textContent = newTheme === 'light' ? '☀️' : '🌙';
    playSound('click');
  });

  // Sound Toggle
  DOM.soundToggle.addEventListener('click', () => {
    isSoundEnabled = !isSoundEnabled;
    DOM.soundToggle.querySelector('.btn-icon').textContent = isSoundEnabled ? '🔊' : '🔇';
    if (isSoundEnabled) {
      initAudio();
      playSound('click');
    }
  });

  // Radio selection buttons in Category filter
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeCategory = e.target.dataset.category;
      playSound('click');
    });
  });

  // Mode radio triggers click audio
  document.querySelectorAll('input[name="quiz-mode"]').forEach(input => {
    input.addEventListener('change', () => {
      quizMode = input.value;
      playSound('click');
    });
  });

  // Navigation Buttons
  DOM.startQuizBtn.addEventListener('click', startQuiz);
  DOM.quitQuizBtn.addEventListener('click', showConfirmModal);
  DOM.confirmCancelBtn.addEventListener('click', hideConfirmModal);
  DOM.confirmOkBtn.addEventListener('click', executeQuitQuiz);
  DOM.nextQBtn.addEventListener('click', goToNextQuestion);
  DOM.restartQuizBtn.addEventListener('click', () => { showScreen(DOM.startScreen); playSound('click'); });
  DOM.retryFailedBtn.addEventListener('click', startRetryFailedQuiz);
  if (DOM.overrideCorrectBtn) {
    DOM.overrideCorrectBtn.addEventListener('click', overrideAsCorrect);
  }
  DOM.homeBtn.addEventListener('click', () => { showScreen(DOM.startScreen); playSound('click'); });

  // AI Oral Exam Action Listeners
  DOM.aiCheckBtn.addEventListener('click', checkAnswerWithAI);
  DOM.toggleAcademicBtn.addEventListener('click', () => {
    playSound('click');
    const isHidden = DOM.academicAnswerBox.classList.contains('hidden');
    if (isHidden) {
      DOM.academicAnswerBox.classList.remove('hidden');
      DOM.toggleAcademicBtn.textContent = 'Скрыть эталонный ответ';
      triggerMathJax();
    } else {
      DOM.academicAnswerBox.classList.add('hidden');
      DOM.toggleAcademicBtn.textContent = 'Показать эталонный ответ';
    }
  });

  // Study Mode Listeners
  DOM.studyModeBtn.addEventListener('click', enterStudyMode);
  DOM.studyBackBtn.addEventListener('click', () => { showScreen(DOM.startScreen); playSound('click'); });
  
  document.querySelectorAll('.study-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.study-filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeStudyCategory = e.target.dataset.studyCategory;
      playSound('click');
      filterStudyQuestions();
    });
  });

  DOM.studySearchInput.addEventListener('input', filterStudyQuestions);

  // Quiz Ask AI panel
  DOM.quizAskAiToggle.addEventListener('click', () => {
    const isOpen = !DOM.quizAskAiBody.classList.contains('collapsed');
    if (isOpen) {
      DOM.quizAskAiBody.classList.add('collapsed');
      DOM.quizAskAiArrow.textContent = '▸';
    } else {
      DOM.quizAskAiBody.classList.remove('collapsed');
      DOM.quizAskAiArrow.textContent = '▾';
      DOM.quizAiInput.focus();
    }
    playSound('click');
  });

  DOM.quizAiSendBtn.addEventListener('click', quizAskAI);
  DOM.quizAiInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') quizAskAI();
  });
}

function showScreen(screen) {
  // Hide ALL screens (including study screen)
  DOM.startScreen.classList.remove('active');
  DOM.quizScreen.classList.remove('active');
  DOM.resultsScreen.classList.remove('active');
  DOM.studyScreen.classList.remove('active');
  
  // Show target
  screen.classList.add('active');
  screen.classList.add('fade-in');
  setTimeout(() => screen.classList.remove('fade-in'), 400);
}

/* ==========================================================================
   QUIZ ENGINE
   ========================================================================== */
function startQuiz() {
  playSound('click');

  let rawQuestions = [];

  if (quizMode === 'exam') {
    // EXAM MODE: 3 random questions from each category = 9 total
    const categories = ['general', 'ai', 'practical'];
    categories.forEach(cat => {
      const pool = questions.filter(q => q.category === cat);
      // Fisher-Yates shuffle pool, take first 3
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      rawQuestions.push(...pool.slice(0, 3));
    });
  } else {
    // TRAINING / AI MODE: use category filter as before
    if (activeCategory === 'all') {
      rawQuestions = [...questions];
    } else {
      rawQuestions = questions.filter(q => q.category === activeCategory);
    }
  }

  // Shuffle options within each question
  filteredQuestions = rawQuestions.map(q => shuffleQuestionOptions(q));

  // Shuffle question order (Fisher-Yates)
  for (let i = filteredQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filteredQuestions[i], filteredQuestions[j]] = [filteredQuestions[j], filteredQuestions[i]];
  }

  if (filteredQuestions.length === 0) {
    alert('В выбранном разделе нет вопросов!');
    return;
  }

  // Initialize State
  currentQuestionIndex = 0;
  score = 0;
  userAnswers = [];
  timeLeft = (quizMode === 'exam') ? 60 * 60 : 25 * 60; // 60 min exam, 25 min training
  quizStartTime = Date.now();

  // Configure Layout Mode
  if (quizMode === 'exam') {
    DOM.examTimer.classList.remove('hidden');
    DOM.nextQBtn.textContent = 'Дальше';
    startTimer();
  } else {
    DOM.examTimer.classList.add('hidden');
    DOM.nextQBtn.textContent = 'Дальше';
    stopTimer();
  }

  // Render First Question
  renderQuestion();
  showScreen(DOM.quizScreen);
}

function startRetryFailedQuiz() {
  playSound('click');
  if (failedQuestionIds.length === 0) return;

  // Filter the original questions array to include only the failed questions
  let rawQuestions = questions.filter(q => failedQuestionIds.includes(q.id));

  // Map each question to a new object with dynamically shuffled options
  filteredQuestions = rawQuestions.map(q => shuffleQuestionOptions(q));

  // Shuffle questions array always to prevent rote learning (Fisher-Yates)
  for (let i = filteredQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filteredQuestions[i], filteredQuestions[j]] = [filteredQuestions[j], filteredQuestions[i]];
  }

  // Initialize State
  currentQuestionIndex = 0;
  score = 0;
  userAnswers = [];
  timeLeft = (quizMode === 'exam') ? 60 * 60 : 25 * 60;
  quizStartTime = Date.now();

  // Configure Layout Mode
  if (quizMode === 'exam') {
    DOM.examTimer.classList.remove('hidden');
    DOM.nextQBtn.textContent = 'Дальше';
    startTimer();
  } else {
    DOM.examTimer.classList.add('hidden');
    DOM.nextQBtn.textContent = 'Дальше';
    stopTimer();
  }

  // Render First Question
  renderQuestion();
  showScreen(DOM.quizScreen);
}

function startTimer() {
  stopTimer();
  updateTimerText();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerText();
    if (timeLeft <= 0) {
      stopTimer();
      finishQuiz();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerText() {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  DOM.timeLeftText.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function renderQuestion() {
  const currentQuestion = filteredQuestions[currentQuestionIndex];
  
  // Update HUD
  DOM.currentQNum.textContent = currentQuestionIndex + 1;
  DOM.totalQNum.textContent = filteredQuestions.length;
  DOM.categoryBadge.textContent = getCategoryName(currentQuestion.category);
  
  // Progress Bar
  const progressPercent = ((currentQuestionIndex + 1) / filteredQuestions.length) * 100;
  DOM.progressBar.style.width = `${progressPercent}%`;

  // Render text
  DOM.questionText.innerHTML = currentQuestion.question.replace(/\n/g, '<br>');
  
  // Clear layout box
  DOM.explanationBox.classList.add('hidden');
  DOM.nextQBtn.classList.add('hidden');
  // Reset quiz Ask AI panel
  DOM.quizAskAiPanel.classList.add('hidden');
  DOM.quizAskAiBody.classList.add('collapsed');
  DOM.quizAskAiArrow.textContent = '▸';
  DOM.quizAiInput.value = '';
  DOM.quizAiResponse.classList.add('hidden');
  DOM.quizAiResponse.innerHTML = '';
  DOM.quizAiLoading.classList.add('hidden');
  if (DOM.overrideCorrectBtn) {
    DOM.overrideCorrectBtn.classList.add('hidden');
  }

  if (quizMode === 'ai') {
    // Show AI writing workspace, HIDE and CLEAR choices grid completely
    DOM.aiWriteContainer.classList.remove('hidden');
    DOM.optionsGrid.style.display = 'none';
    DOM.optionsGrid.innerHTML = ''; // Clear old buttons from previous test
    DOM.aiResultBox.classList.add('hidden');
    DOM.aiLoadingBox.classList.add('hidden');
    
    // Reset inputs
    DOM.aiUserAnswer.value = '';
    DOM.aiUserAnswer.disabled = false;
    DOM.aiCheckBtn.disabled = false;
    
    // Reset academic reveal sub-card
    DOM.academicAnswerBox.classList.add('hidden');
    DOM.toggleAcademicBtn.textContent = 'Показать эталонный ответ';
  } else {
    // Standard training or exam multiple-choice options
    DOM.aiWriteContainer.classList.add('hidden');
    DOM.optionsGrid.style.display = ''; // Restore CSS default (grid)
    DOM.aiResultBox.classList.add('hidden');
    DOM.aiLoadingBox.classList.add('hidden');

    // Render Options
    DOM.optionsGrid.innerHTML = '';
    currentQuestion.options.forEach((option, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      
      btn.innerHTML = `
        <span>${option}</span>
        <span class="option-indicator">${String.fromCharCode(65 + idx)}</span>
      `;
      
      btn.addEventListener('click', () => handleOptionClick(idx));
      DOM.optionsGrid.appendChild(btn);
    });
  }

  // Render LaTeX math formulas
  triggerMathJax();
}

function handleOptionClick(selectedIdx) {

  const currentQuestion = filteredQuestions[currentQuestionIndex];
  
  // Disable all option buttons
  const optionButtons = DOM.optionsGrid.querySelectorAll('.option-btn');
  optionButtons.forEach(btn => btn.disabled = true);

  const isCorrect = (selectedIdx === currentQuestion.correctIndex);
  if (isCorrect) score++;

  userAnswers.push({
    questionId: currentQuestion.id,
    selectedIndex: selectedIdx,
    correct: isCorrect
  });

  if (quizMode === 'training') {
    // TRAINING MODE: Show immediate feedback
    if (isCorrect) {
      playSound('correct');
      optionButtons[selectedIdx].classList.add('correct');
      DOM.explanationBox.className = 'explanation-box correct-feedback';
      DOM.feedbackText.textContent = 'Правильно!';
      DOM.feedbackIcon.textContent = '✓';
    } else {
      playSound('wrong');
      optionButtons[selectedIdx].classList.add('wrong');
      optionButtons[currentQuestion.correctIndex].classList.add('correct');
      DOM.explanationBox.className = 'explanation-box wrong-feedback';
      DOM.feedbackText.textContent = 'Неправильно';
      DOM.feedbackIcon.textContent = '✗';
    }
    
    DOM.explanationText.innerHTML = currentQuestion.explanation.replace(/\n/g, '<br>');
    DOM.explanationBox.classList.remove('hidden');
    DOM.nextQBtn.classList.remove('hidden');
    DOM.quizAskAiPanel.classList.remove('hidden'); // Show Ask AI
    triggerMathJax();
  } else {
    // EXAM MODE: Highlight selection neutrally, auto-advance or show next
    playSound('click');
    optionButtons[selectedIdx].style.borderColor = 'var(--primary)';
    optionButtons[selectedIdx].style.backgroundColor = 'var(--primary-glow)';
    
    DOM.nextQBtn.classList.remove('hidden');
    DOM.quizAskAiPanel.classList.remove('hidden'); // Show Ask AI in exam too
  }
}

function overrideAsCorrect() {
  playSound('correct');
  score++;

  if (userAnswers.length > 0) {
    userAnswers[userAnswers.length - 1].correct = true;
    if (userAnswers[userAnswers.length - 1].score !== undefined) {
      userAnswers[userAnswers.length - 1].score = 100;
    }
  }

  DOM.aiVerdictBadge.textContent = 'Зачтено!';
  DOM.aiVerdictBadge.className = 'ai-verdict-badge passed';
  DOM.aiScoreValue.textContent = '100%';
  if (DOM.overrideCorrectBtn) {
    DOM.overrideCorrectBtn.classList.add('hidden');
  }
}

function goToNextQuestion() {
  playSound('click');
  currentQuestionIndex++;
  
  if (currentQuestionIndex < filteredQuestions.length) {
    renderQuestion();
  } else {
    finishQuiz();
  }
}

function finishQuiz() {
  stopTimer();
  totalTimeTaken = Math.floor((Date.now() - quizStartTime) / 1000);
  
  // Render results
  const correctCount = score;
  const wrongCount = filteredQuestions.length - score;
  const percentage = Math.round((correctCount / filteredQuestions.length) * 100);

  // Sound
  if (percentage >= 60) {
    playSound('victory');
  } else {
    playSound('wrong');
  }

  // Display details
  DOM.scorePercent.textContent = `${percentage}%`;
  DOM.scoreFraction.textContent = `${correctCount} / ${filteredQuestions.length}`;
  DOM.scoreVerdict.textContent = getScoreVerdict(percentage);
  
  // Radial SVG animation offset
  // Circumference is 2 * PI * 50 = 314.15
  const strokeOffset = 314.15 - (314.15 * percentage) / 100;
  DOM.radialBar.style.strokeDashoffset = strokeOffset;

  // Custom colors for radial bar based on percentage
  if (percentage >= 80) {
    DOM.radialBar.style.stroke = 'var(--correct)';
  } else if (percentage >= 50) {
    DOM.radialBar.style.stroke = 'var(--primary)';
  } else {
    DOM.radialBar.style.stroke = 'var(--wrong)';
  }

  if (quizMode === 'training') {
    DOM.resultMode.textContent = 'Тренировка';
  } else if (quizMode === 'exam') {
    DOM.resultMode.textContent = 'Экзамен';
  } else if (quizMode === 'ai') {
    DOM.resultMode.textContent = 'Устный ответ (ИИ)';
  }

  DOM.resultCategory.textContent = getCategoryLabel(activeCategory);
  DOM.resultTime.textContent = formatTime(totalTimeTaken);
  DOM.resultCorrect.textContent = correctCount;
  DOM.resultWrong.textContent = wrongCount;

  // Build wrong answers analysis list
  DOM.wrongAnswersList.innerHTML = '';
  const wrongUserAnswers = userAnswers.filter(a => !a.correct);
  failedQuestionIds = wrongUserAnswers.map(a => a.questionId);

  if (failedQuestionIds.length > 0) {
    DOM.retryFailedBtn.classList.remove('hidden');
  } else {
    DOM.retryFailedBtn.classList.add('hidden');
  }

  if (wrongUserAnswers.length === 0) {
    DOM.wrongAnswersList.innerHTML = `
      <div style="text-align:center; padding: 20px; color: var(--correct)">
        🎉 Великолепно! Вы ответили на все вопросы правильно!
      </div>
    `;
  } else {
    wrongUserAnswers.forEach((answer, idx) => {
      const q = filteredQuestions.find(item => item.id === answer.questionId);
      const card = document.createElement('div');
      card.className = 'wrong-answer-card';
      
      if (answer.selectedIndex === -1) {
        // AI Oral Exam response formatting
        card.innerHTML = `
          <h4>${q.question}</h4>
          <div class="wrong-answer-choice" style="color: var(--wrong)">❌ Оценка ИИ: <strong>${answer.score}%</strong></div>
          <div class="wrong-answer-choice" style="color: var(--text-muted); margin-top: 5px;">
            📝 Ваш ответ:<br>
            <em style="display:block; padding: 10px; background: hsla(0,0%,0%,0.2); border-radius: var(--radius-sm); margin-top: 5px;">${answer.userAnswerText}</em>
          </div>
          <p class="reason" style="margin-top: 10px;">
            📚 Эталонный ответ:<br>
            <span class="tex2jax_process">${q.explanation.replace(/\n/g, '<br>')}</span>
          </p>
        `;
      } else {
        // Standard choice wrong answer
        card.innerHTML = `
          <h4>${q.question}</h4>
          <div class="wrong-answer-choice">❌ Ваш ответ: <strong>${q.options[answer.selectedIndex]}</strong></div>
          <div class="correct-answer-choice">✓ Правильный ответ: <strong>${q.options[q.correctIndex]}</strong></div>
          <p class="reason">${q.explanation.replace(/\n/g, '<br>')}</p>
        `;
      }

      // --- Ask AI panel ---
      const aiPanelId = `res-ai-${idx}`;
      const aiPanel = document.createElement('div');
      aiPanel.className = 'quiz-ask-ai-panel';
      aiPanel.style.marginTop = '14px';
      aiPanel.innerHTML = `
        <button class="quiz-ask-ai-toggle" onclick="toggleResAiPanel('${aiPanelId}')">
          <span>🤖 Спросить ИИ про этот вопрос</span>
          <span id="${aiPanelId}-arrow" class="ask-ai-arrow">▸</span>
        </button>
        <div id="${aiPanelId}-body" class="quiz-ask-ai-body collapsed">
          <div class="quiz-ai-input-row">
            <input id="${aiPanelId}-input" type="text" class="quiz-ai-input"
              placeholder="Задайте вопрос ИИ по данной теме..." />
            <button class="btn primary-btn quiz-ai-send-btn"
              onclick="sendResAiQuestion('${aiPanelId}', ${q.id})">Спросить</button>
          </div>
          <div id="${aiPanelId}-loading" class="study-ai-loading hidden">
            <span class="study-ai-spinner"></span> ИИ думает...
          </div>
          <div id="${aiPanelId}-response" class="quiz-ai-response hidden"></div>
        </div>
      `;

      card.appendChild(aiPanel);
      DOM.wrongAnswersList.appendChild(card);
    });
    triggerMathJax();
  }


  showScreen(DOM.resultsScreen);
}

function showConfirmModal() {
  playSound('click');
  DOM.confirmModal.classList.remove('hidden');
}

function hideConfirmModal() {
  playSound('click');
  DOM.confirmModal.classList.add('hidden');
}

function executeQuitQuiz() {
  playSound('click');
  DOM.confirmModal.classList.add('hidden');
  stopTimer();
  showScreen(DOM.startScreen);
}

/* ==========================================================================
   HELPERS & FORMATTING
   ========================================================================== */
function getCategoryName(cat) {
  switch(cat) {
    case 'general': return 'Общие ИТ/ИБ';
    case 'ai': return 'Искусственный интеллект';
    case 'practical': return 'Практическая задача';
    default: return 'Вопрос';
  }
}

function getCategoryLabel(cat) {
  switch(cat) {
    case 'all': return 'Все разделы (49)';
    case 'general': return 'Общие ИТ/ИБ темы (25)';
    case 'ai': return 'Искусственный интеллект (17)';
    case 'practical': return 'Практические задачи (7)';
    default: return 'Вопросы';
  }
}

function getScoreVerdict(percentage) {
  if (percentage >= 90) return 'Отличный результат! Вы полностью готовы!';
  if (percentage >= 70) return 'Хороший результат! Но можно улучшить!';
  if (percentage >= 50) return 'Удовлетворительно. Рекомендуется повторить теорию.';
  return 'Неудовлетворительно. Нужно подучить!';
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function triggerMathJax() {
  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    window.MathJax.typesetPromise().catch((err) => console.warn('MathJax typesetting failed:', err));
  }
}

function shuffleQuestionOptions(question) {
  // Create a copy of the options array
  const options = [...question.options];
  const correctOptionText = options[question.correctIndex];
  
  // Shuffle options using Fisher-Yates algorithm
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  
  // Find the new index of the correct option
  const newCorrectIndex = options.indexOf(correctOptionText);
  
  return {
    ...question,
    options: options,
    correctIndex: newCorrectIndex
  };
}

/* ==========================================================================
   AI ORAL EXAM CONTROLLER (Оценка устных ответов через API)
   ========================================================================== */
function checkAnswerWithAI() {
  const answerText = DOM.aiUserAnswer.value.trim();
  
  // Validation
  if (answerText.length === 0) {
    alert("Пожалуйста, напишите ваш ответ.");
    return;
  }

  playSound('click');

  // Set loading state
  DOM.aiUserAnswer.disabled = true;
  DOM.aiCheckBtn.disabled = true;
  DOM.aiLoadingBox.classList.remove('hidden');
  DOM.aiResultBox.classList.add('hidden');
  DOM.nextQBtn.classList.add('hidden');

  DOM.aiLoadingBox.scrollIntoView({ behavior: 'smooth' });

  const currentQuestion = filteredQuestions[currentQuestionIndex];

  // Request to local dev/Vercel serverless endpoint
  fetch('/api/check-answer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question: currentQuestion.question,
      etalon: currentQuestion.explanation,
      userAnswer: answerText
    })
  })
  .then(async response => {
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Ошибка сервера (статус ${response.status})`);
    }
    return response.json();
  })
  .then(data => {
    // Hide loading
    DOM.aiLoadingBox.classList.add('hidden');
    
    // Parse results
    const scoreVal = parseInt(data.score) || 0;
    const verdictText = data.verdict || (scoreVal >= 50 ? "Зачтено" : "Не зачтено");
    const isCorrect = scoreVal >= 50;

    if (isCorrect) score++;

    // Save answer state
    userAnswers.push({
      questionId: currentQuestion.id,
      selectedIndex: -1, // indicating text reply
      correct: isCorrect,
      score: scoreVal,
      userAnswerText: answerText
    });

    // Sound feedback
    playSound(isCorrect ? 'correct' : 'wrong');

    // Populate UI
    DOM.aiScoreValue.textContent = `${scoreVal}%`;
    DOM.aiVerdictBadge.textContent = verdictText;
    
    // Set badge classes
    DOM.aiVerdictBadge.className = 'ai-verdict-badge';
    if (isCorrect) {
      DOM.aiVerdictBadge.classList.add('passed');
      if (DOM.overrideCorrectBtn) {
        DOM.overrideCorrectBtn.classList.add('hidden');
      }
    } else {
      DOM.aiVerdictBadge.classList.add('failed');
      if (DOM.overrideCorrectBtn) {
        DOM.overrideCorrectBtn.classList.remove('hidden');
      }
    }

    // Populate details (with protection against XSS but allowing linebreaks and math)
    DOM.aiCorrectText.innerHTML = (data.what_is_correct || "Нет данных").replace(/\n/g, '<br>');
    DOM.aiMissingText.innerHTML = (data.what_is_missing || "Нет данных").replace(/\n/g, '<br>');
    DOM.aiCommentText.innerHTML = (data.explanation || "Нет комментариев").replace(/\n/g, '<br>');

    // Populate academic etalon
    DOM.academicAnswerText.innerHTML = currentQuestion.explanation.replace(/\n/g, '<br>');

    // Show result card
    DOM.aiResultBox.classList.remove('hidden');
    DOM.nextQBtn.classList.remove('hidden');

    DOM.aiResultBox.scrollIntoView({ behavior: 'smooth' });

    // Typeset LaTeX math symbols
    triggerMathJax();
  })
  .catch(error => {
    console.error('AI check failed:', error);
    
    DOM.aiLoadingBox.classList.add('hidden');
    
    // Save answer state as failed
    userAnswers.push({
      questionId: currentQuestion.id,
      selectedIndex: -1,
      correct: false,
      score: 0,
      userAnswerText: answerText
    });

    // Populate with error info
    DOM.aiScoreValue.textContent = '0%';
    DOM.aiVerdictBadge.textContent = 'Ошибка';
    DOM.aiVerdictBadge.className = 'ai-verdict-badge failed';
    if (DOM.overrideCorrectBtn) {
      DOM.overrideCorrectBtn.classList.remove('hidden');
    }

    DOM.aiCorrectText.innerHTML = '<span style="color:var(--wrong)">Не удалось завершить автоматическую проверку ИИ.</span>';
    DOM.aiMissingText.textContent = error.message || 'Возможно, отсутствует подключение к сети или не задан API-ключ в переменных окружения.';
    DOM.aiCommentText.textContent = 'Вы можете продолжить тест, нажав кнопку «Дальше» или принудительно засчитать ответ.';

    DOM.aiResultBox.classList.remove('hidden');
    DOM.nextQBtn.classList.remove('hidden');

    DOM.aiResultBox.scrollIntoView({ behavior: 'smooth' });
  });
}

/* ==========================================================================
   STUDY MODE CONTROLLER
   ========================================================================== */
function enterStudyMode() {
  playSound('click');
  DOM.studySearchInput.value = '';
  activeStudyCategory = 'all';
  
  // Reset active filter button in UI
  document.querySelectorAll('.study-filter-btn').forEach(btn => {
    if (btn.dataset.studyCategory === 'all') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  renderStudyQuestions();
  showScreen(DOM.studyScreen);
}

function renderStudyQuestions() {
  DOM.studyQuestionsList.innerHTML = '';
  
  const searchVal = DOM.studySearchInput.value.toLowerCase().trim();
  
  // 1. Filter questions by category
  let rawList = questions;
  if (activeStudyCategory !== 'all') {
    rawList = questions.filter(q => q.category === activeStudyCategory);
  }
  
  // 2. Filter by search query (check question text, options and explanation)
  if (searchVal) {
    rawList = rawList.filter(q => {
      const questionMatch = q.question.toLowerCase().includes(searchVal);
      const explanationMatch = q.explanation.toLowerCase().includes(searchVal);
      const optionsMatch = q.options.some(opt => opt.toLowerCase().includes(searchVal));
      return questionMatch || explanationMatch || optionsMatch;
    });
  }

  if (rawList.length === 0) {
    DOM.studyQuestionsList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 1.05rem;">
        🔍 Вопросы не найдены по вашему запросу.
      </div>
    `;
    return;
  }

  // 3. Render cards
  rawList.forEach((q, index) => {
    const card = document.createElement('div');
    card.className = 'study-card';
    
    // Category label formatting
    const categoryLabel = getCategoryLabel(q.category);
    
    // Construct Options list
    let optionsHtml = '';
    q.options.forEach((opt, optIdx) => {
      const isCorrect = optIdx === q.correctIndex;
      optionsHtml += `
        <div class="study-option ${isCorrect ? 'correct' : ''}">
          ${isCorrect ? '✓ ' : '• '} ${opt}
        </div>
      `;
    });

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; width: 100%;">
        <span class="badge" style="background-color: var(--primary-glow); color: var(--primary-hover); font-weight: 700; margin-bottom: 5px;">${categoryLabel}</span>
        <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">№ ${q.id}</span>
      </div>
      <h4>${q.question}</h4>
      <div class="study-options-container">
        ${optionsHtml}
      </div>
      <p class="reason" style="margin-top: 10px; border-top: 1px solid var(--card-border); padding-top: 15px; color: var(--text-muted); font-size: 0.9rem; line-height: 1.6;">
        <strong>📚 Разбор решения:</strong><br>
        <span class="tex2jax_process">${q.explanation.replace(/\n/g, '<br>')}</span>
      </p>
      
      <!-- AI Question Section -->
      <div class="study-ai-wrapper" style="margin-top: 15px; border-top: 1px dashed var(--card-border); padding-top: 15px; width: 100%;">
        <button class="btn secondary-btn small-btn study-ai-toggle-btn" style="padding: 6px 12px; font-size: 0.8rem; border-radius: var(--radius-sm);">🙋 Спросить у ИИ</button>
        
        <div class="study-ai-box hidden" style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; gap: 8px; width: 100%;">
            <input type="text" class="study-ai-input" placeholder="Задайте вопрос ИИ по этой теме..." style="flex: 1; padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--card-border); background: hsla(0, 0%, 0%, 0.1); color: var(--text-main); font-family: var(--font-main); font-size: 0.85rem; outline: none;">
            <button class="btn primary-btn small-btn study-ai-send-btn" style="padding: 10px 16px; font-size: 0.85rem; border-radius: var(--radius-sm);">Спросить</button>
          </div>
          
          <div class="study-ai-loading hidden" style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px; padding: 5px 0;">
            <span class="study-ai-spinner"></span>
            Экзаменатор думает...
          </div>
          
          <div class="study-ai-response-box hidden" style="background: hsla(250, 85%, 65%, 0.05); border-left: 3px solid var(--primary); padding: 12px 15px; border-radius: var(--radius-sm); font-size: 0.88rem; line-height: 1.5; color: var(--text-main);">
            <!-- Dynamic response -->
          </div>
        </div>
      </div>
    `;

    // Hook up local events for this card
    const toggleBtn = card.querySelector('.study-ai-toggle-btn');
    const aiBox = card.querySelector('.study-ai-box');
    const sendBtn = card.querySelector('.study-ai-send-btn');
    const aiInput = card.querySelector('.study-ai-input');
    const loadingBox = card.querySelector('.study-ai-loading');
    const responseBox = card.querySelector('.study-ai-response-box');

    toggleBtn.addEventListener('click', () => {
      playSound('click');
      const isHidden = aiBox.classList.contains('hidden');
      if (isHidden) {
        aiBox.classList.remove('hidden');
        toggleBtn.textContent = '📖 Скрыть диалог ИИ';
        aiInput.focus();
      } else {
        aiBox.classList.add('hidden');
        toggleBtn.textContent = '🙋 Спросить у ИИ';
      }
    });

    const askAI = () => {
      const userQuestionText = aiInput.value.trim();
      if (!userQuestionText) return;

      playSound('click');
      sendBtn.disabled = true;
      aiInput.disabled = true;
      loadingBox.classList.remove('hidden');
      responseBox.classList.add('hidden');

      fetch('/api/check-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: q.question,
          etalon: q.explanation,
          userQuestion: userQuestionText
        })
      })
      .then(async response => {
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Ошибка сервера (статус ${response.status})`);
        }
        return response.json();
      })
      .then(data => {
        loadingBox.classList.add('hidden');
        sendBtn.disabled = false;
        aiInput.disabled = false;

        const aiResponseText = data.answer || "Не удалось получить ответ ИИ.";
        
        responseBox.innerHTML = `
          <strong>🤖 Ответ ИИ-ассистента:</strong>
          <div class="ai-md-body tex2jax_process">${markdownToHtml(aiResponseText)}</div>
        `;
        responseBox.classList.remove('hidden');
        
        // Re-run MathJax typesetting for new text
        triggerMathJax();
      })
      .catch(err => {
        console.error('Study AI ask failed:', err);
        loadingBox.classList.add('hidden');
        sendBtn.disabled = false;
        aiInput.disabled = false;

        responseBox.innerHTML = `<span style="color:var(--wrong)">❌ Ошибка: ${err.message || "Не удалось отправить запрос к ИИ."}</span>`;
        responseBox.classList.remove('hidden');
      });
    };

    sendBtn.addEventListener('click', askAI);
    aiInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        askAI();
      }
    });
    
    DOM.studyQuestionsList.appendChild(card);
  });

  // Typeset math formulas
  triggerMathJax();
}

/**
 * Toggle collapse/expand of a result-screen Ask AI panel.
 * Called via onclick= attribute in dynamically generated HTML.
 */
function toggleResAiPanel(panelId) {
  const body = document.getElementById(`${panelId}-body`);
  const arrow = document.getElementById(`${panelId}-arrow`);
  if (!body) return;
  const isCollapsed = body.classList.contains('collapsed');
  if (isCollapsed) {
    body.classList.remove('collapsed');
    arrow.textContent = '▾';
    const input = document.getElementById(`${panelId}-input`);
    if (input) input.focus();
  } else {
    body.classList.add('collapsed');
    arrow.textContent = '▸';
  }
  playSound('click');
}

/**
 * Send AI question from the result-screen panel.
 * @param {string} panelId - unique panel identifier
 * @param {number} questionId - question ID to look up data
 */
function sendResAiQuestion(panelId, questionId) {
  const q = questions.find(item => item.id === questionId);
  if (!q) return;

  const inputEl    = document.getElementById(`${panelId}-input`);
  const loadingEl  = document.getElementById(`${panelId}-loading`);
  const responseEl = document.getElementById(`${panelId}-response`);
  const sendBtn    = inputEl ? inputEl.closest('.quiz-ask-ai-body').querySelector('.quiz-ai-send-btn') : null;

  if (!inputEl) return;
  const userQuestion = inputEl.value.trim();
  if (!userQuestion) { inputEl.focus(); return; }

  // Show loading state
  loadingEl.classList.remove('hidden');
  responseEl.classList.add('hidden');
  if (sendBtn) sendBtn.disabled = true;
  inputEl.disabled = true;

  const correctOption = q.options ? q.options[q.correctIndex] : '';
  const shortExplanation = (q.explanation || '').slice(0, 300);
  const etalonContext = `Правильный ответ: ${correctOption}\n${shortExplanation}`;

  fetch('/api/check-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: q.question,
      etalon: etalonContext,
      userQuestion: userQuestion
    })
  })
    .then(res => {
      if (!res.ok) return res.json().catch(() => ({})).then(d => { throw new Error(d.error || `Ошибка (${res.status})`); });
      return res.json();
    })
    .then(data => {
      loadingEl.classList.add('hidden');
      if (sendBtn) sendBtn.disabled = false;
      inputEl.disabled = false;
      const answerText = data.answer || 'Не удалось получить ответ.';
      responseEl.innerHTML = `
        <strong>🤖 Ответ ИИ-ассистента:</strong>
        <div class="ai-md-body tex2jax_process">${markdownToHtml(answerText)}</div>
      `;
      responseEl.classList.remove('hidden');
      triggerMathJax();
    })
    .catch(err => {
      loadingEl.classList.add('hidden');
      if (sendBtn) sendBtn.disabled = false;
      inputEl.disabled = false;
      responseEl.innerHTML = `<span style="color:var(--wrong)">❌ Ошибка: ${err.message}</span>`;
      responseEl.classList.remove('hidden');
    });
}

function filterStudyQuestions() {
  renderStudyQuestions();
}


/**
 * Quiz-mode Ask AI: sends the current question context + user question to AI,
 * renders Markdown response in the panel under the answer.
 */
function quizAskAI() {
  const currentQuestion = filteredQuestions[currentQuestionIndex];
  if (!currentQuestion) return;

  const userQuestion = DOM.quizAiInput.value.trim();
  if (!userQuestion) {
    DOM.quizAiInput.focus();
    return;
  }

  // Build a SHORT context — only question + correct answer + explanation
  // (do NOT send all 4 long option texts — it makes prompts huge and slow)
  const correctOption = currentQuestion.options
    ? currentQuestion.options[currentQuestion.correctIndex]
    : '';
  // Trim explanation to first 300 chars to keep prompt small
  const shortExplanation = (currentQuestion.explanation || '').slice(0, 300);
  const questionContext = `${currentQuestion.question}`;
  const etalonContext = `Правильный ответ: ${correctOption}\n${shortExplanation}`;

  // Show loading
  DOM.quizAiLoading.classList.remove('hidden');
  DOM.quizAiResponse.classList.add('hidden');
  DOM.quizAiSendBtn.disabled = true;
  DOM.quizAiInput.disabled = true;

  fetch('/api/check-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: questionContext,
      etalon: etalonContext,
      userQuestion: userQuestion
    })
  })

    .then(response => {
      if (!response.ok) {
        return response.json().catch(() => ({})).then(d => {
          throw new Error(d.error || `Ошибка сервера (${response.status})`);
        });
      }
      return response.json();
    })
    .then(data => {
      DOM.quizAiLoading.classList.add('hidden');
      DOM.quizAiSendBtn.disabled = false;
      DOM.quizAiInput.disabled = false;

      const answerText = data.answer || 'Не удалось получить ответ ИИ.';
      DOM.quizAiResponse.innerHTML = `
        <strong>🤖 Ответ ИИ-ассистента:</strong>
        <div class="ai-md-body tex2jax_process">${markdownToHtml(answerText)}</div>
      `;
      DOM.quizAiResponse.classList.remove('hidden');
      triggerMathJax();
    })
    .catch(err => {
      DOM.quizAiLoading.classList.add('hidden');
      DOM.quizAiSendBtn.disabled = false;
      DOM.quizAiInput.disabled = false;
      DOM.quizAiResponse.innerHTML = `<span style="color:var(--wrong)">❌ Ошибка: ${err.message}</span>`;
      DOM.quizAiResponse.classList.remove('hidden');
    });
}


/**
 * Lightweight Markdown → HTML converter for AI responses.
 * Handles: headings (#, ##, ###), bold, italic, inline-code, code-blocks,
 * unordered lists (-, *), horizontal rules, and paragraphs.
 */
function markdownToHtml(md) {
  if (!md) return '';

  const lines = md.split('\n');
  const output = [];
  let inList = false;
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines = [];

  const closeList = () => {
    if (inList) { output.push('</ul>'); inList = false; }
  };

  const processInline = (text) => {
    // Escape HTML first
    text = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Bold+italic
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code class="ai-code-inline">$1</code>');
    return text;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block fence
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        closeList();
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
        codeLines = [];
      } else {
        inCodeBlock = false;
        const escaped = codeLines.join('\n')
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        output.push(`<pre class="ai-code-block"><code>${escaped}</code></pre>`);
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Horizontal rule
    if (/^(---|___|||\*\*\*)\s*$/.test(line.trim())) {
      closeList();
      output.push('<hr class="ai-hr">');
      continue;
    }

    // Headings
    const h3 = line.match(/^###\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h1 = line.match(/^#\s+(.+)/);
    if (h3) { closeList(); output.push(`<h4 class="ai-h3">${processInline(h3[1])}</h4>`); continue; }
    if (h2) { closeList(); output.push(`<h3 class="ai-h2">${processInline(h2[1])}</h3>`); continue; }
    if (h1) { closeList(); output.push(`<h2 class="ai-h1">${processInline(h1[1])}</h2>`); continue; }

    // Unordered list item
    const li = line.match(/^[-*+]\s+(.+)/);
    if (li) {
      if (!inList) { output.push('<ul class="ai-list">'); inList = true; }
      output.push(`<li>${processInline(li[1])}</li>`);
      continue;
    }

    // Numbered list item
    const oli = line.match(/^\d+\.\s+(.+)/);
    if (oli) {
      if (!inList) { output.push('<ol class="ai-list">'); inList = true; }
      output.push(`<li>${processInline(oli[1])}</li>`);
      continue;
    }

    // Blank line → paragraph break
    if (line.trim() === '') {
      closeList();
      output.push('<br>');
      continue;
    }

    // Normal line → paragraph
    closeList();
    output.push(`<p class="ai-p">${processInline(line)}</p>`);
  }

  closeList();
  return output.join('\n');
}

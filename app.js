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
let activeConstrCategory = 'all';
let selectedConstrIds = new Set();
let skippedQuestions = new Set(); // Indexes of skipped questions

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
  skipQBtn: document.getElementById('skip-q-btn'),
  finishQuizBtn: document.getElementById('finish-quiz-btn'),
  questionNavBar: document.getElementById('question-nav-bar'),
  restartQuizBtn: document.getElementById('restart-quiz-btn'),
  retryFailedBtn: document.getElementById('retry-failed-btn'),
  homeBtn: document.getElementById('home-btn'),
  studyModeBtn: document.getElementById('study-mode-btn'),
  studyScreen: document.getElementById('study-screen'),
  studyQuestionsList: document.getElementById('study-questions-list'),
  studySearchInput: document.getElementById('study-search-input'),
  studyBackBtn: document.getElementById('study-back-btn'),

  // Constructor
  constructorModeBtn: document.getElementById('constructor-mode-btn'),
  constructorScreen: document.getElementById('constructor-screen'),
  constructorList: document.getElementById('constructor-list'),
  constructorBackBtn: document.getElementById('constructor-back-btn'),
  constructorBuildBtn: document.getElementById('constructor-build-btn'),
  constrSelectAll: document.getElementById('constr-select-all'),
  constrDeselectAll: document.getElementById('constr-deselect-all'),
  constrCountBadge: document.getElementById('constr-count-badge'),
  constrSearchInput: document.getElementById('constr-search-input'),
  constructorResultScreen: document.getElementById('constructor-result-screen'),
  constructorResultList: document.getElementById('constructor-result-list'),
  constrResultSubtitle: document.getElementById('constr-result-subtitle'),
  constructorResultBackBtn: document.getElementById('constructor-result-back-btn'),
  constructorResultHomeBtn: document.getElementById('constructor-result-home-btn'),
  constructorExportPdfBtn: document.getElementById('constructor-export-pdf-btn'),

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
  quizExportPdfBtn: document.getElementById('quiz-export-pdf-btn'),

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

  // Voice Input
  voiceRecordBtn: document.getElementById('voice-record-btn'),
  voiceStatus: document.getElementById('voice-status'),

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
  initVoiceInput();
});

/* ==========================================================================
   VOICE INPUT MODULE (Web Speech API) — cross-browser (Chrome, Edge, Yandex)
   ========================================================================== */
let isRecording = false;
let voiceAccumulated = '';   // final confirmed text across recognition sessions
let voiceRestartTimer = null; // timer to delay restart and avoid race conditions
let voiceSession = null;     // current active SpeechRecognition instance

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

function initVoiceInput() {
  const btn = DOM.voiceRecordBtn;
  const status = DOM.voiceStatus;

  if (!SpeechRecognitionAPI) {
    btn.disabled = true;
    btn.title = 'Ваш браузер не поддерживает голосовой ввод (используйте Chrome или Яндекс Браузер)';
    btn.querySelector('.voice-btn-label').textContent = 'Голос недоступен';
    btn.querySelector('.voice-btn-icon').textContent = '🚫';
    status.textContent = 'Голосовой ввод не поддерживается вашим браузером.';
    status.classList.remove('hidden');
    status.classList.add('not-supported');
    return;
  }

  btn.addEventListener('click', () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  });
}

/**
 * Creates a fresh SpeechRecognition instance.
 * Yandex Browser requires a new object each session — reusing causes errors.
 */
function createVoiceSession() {
  // Destroy previous session safely
  if (voiceSession) {
    voiceSession.onresult = null;
    voiceSession.onerror = null;
    voiceSession.onend = null;
    try { voiceSession.abort(); } catch(e) { /* ignore */ }
    voiceSession = null;
  }

  const sr = new SpeechRecognitionAPI();
  sr.lang = 'ru-RU';
  sr.continuous = true;       // Позволяет непрерывный ввод без частых перезапусков
  sr.interimResults = true;
  sr.maxAlternatives = 1;

  sr.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += text + ' ';
      } else {
        interimTranscript += text;
      }
    }

    if (finalTranscript) {
      voiceAccumulated += finalTranscript;
    }

    DOM.aiUserAnswer.value = voiceAccumulated + interimTranscript;
    DOM.aiUserAnswer.scrollTop = DOM.aiUserAnswer.scrollHeight;

    const status = DOM.voiceStatus;
    if (interimTranscript) {
      status.textContent = '🔴 Слушаю... «' + interimTranscript.slice(0, 55) +
        (interimTranscript.length > 55 ? '…' : '') + '»';
    } else {
      status.textContent = '🔴 Слушаю...';
    }
  };

  sr.onerror = (event) => {
    const err = event.error;

    // no-speech и aborted — штатные ситуации, не останавливаем запись
    if (err === 'no-speech' || err === 'aborted') {
      return;
    }

    isRecording = false;
    clearVoiceRestartTimer();
    const status = DOM.voiceStatus;

    if (err === 'not-allowed') {
      status.textContent = '❌ Доступ к микрофону запрещён. Разрешите доступ к микрофону в настройках браузера.';
    } else if (err === 'service-not-allowed' || err === 'network') {
      status.textContent = '❌ Сервис распознавания недоступен. Яндекс Браузер может блокировать облачный API. Попробуйте Chrome или Edge.';
    } else if (err === 'audio-capture') {
      status.textContent = '❌ Ошибка записи: микрофон не найден или занят.';
    } else {
      status.textContent = `❌ Ошибка голосового ввода (${err}). Запись остановлена.`;
    }

    status.classList.remove('hidden', 'recording-active');
    setVoiceIdle();
    console.warn('Speech recognition error:', err);
  };

  sr.onend = () => {
    // Если флаг записи ещё активен — перезапускаем сессию с задержкой.
    // Задержка 120мс критична для Яндекс Браузера: без неё новый start()
    // выбрасывает InvalidStateError пока предыдущая сессия не завершилась полностью.
    if (isRecording) {
      scheduleVoiceRestart();
    } else {
      setVoiceIdle();
    }
  };

  return sr;
}

function scheduleVoiceRestart() {
  clearVoiceRestartTimer();
  voiceRestartTimer = setTimeout(() => {
    if (!isRecording) return;
    voiceSession = createVoiceSession();
    try {
      voiceSession.start();
    } catch(e) {
      console.warn('Voice restart failed:', e);
      // Попробуем ещё раз через 300мс
      scheduleVoiceRestart();
    }
  }, 120);
}

function clearVoiceRestartTimer() {
  if (voiceRestartTimer) {
    clearTimeout(voiceRestartTimer);
    voiceRestartTimer = null;
  }
}

function startVoiceRecording() {
  if (isRecording) return;

  const btn = DOM.voiceRecordBtn;
  const status = DOM.voiceStatus;

  // Preserve any existing typed text as base for accumulation
  voiceAccumulated = DOM.aiUserAnswer.value;
  if (voiceAccumulated && !voiceAccumulated.endsWith(' ')) {
    voiceAccumulated += ' ';
  }

  isRecording = true;

  voiceSession = createVoiceSession();
  try {
    voiceSession.start();
  } catch(e) {
    console.warn('Could not start speech recognition:', e);
    isRecording = false;
    voiceSession = null;
    return;
  }

  btn.classList.add('recording');
  btn.querySelector('.voice-btn-icon').textContent = '⏹';
  btn.querySelector('.voice-btn-label').textContent = 'Остановить запись';
  btn.title = 'Нажмите чтобы остановить запись';

  status.textContent = '🔴 Запись идёт... Говорите свой ответ';
  status.classList.remove('hidden', 'not-supported');
  status.classList.add('recording-active');
  playSound('click');
}

function stopVoiceRecording() {
  isRecording = false;
  clearVoiceRestartTimer();

  if (voiceSession) {
    try { voiceSession.stop(); } catch(e) { /* ignore */ }
    voiceSession = null;
  }

  const btn = DOM.voiceRecordBtn;
  btn.classList.remove('recording');
  btn.classList.add('processing');
  btn.querySelector('.voice-btn-icon').textContent = '⏳';
  btn.querySelector('.voice-btn-label').textContent = 'Обработка...';

  const status = DOM.voiceStatus;
  status.textContent = '✅ Запись остановлена. Текст вставлен в поле ответа.';
  status.classList.remove('recording-active');

  setTimeout(() => setVoiceIdle(), 1500);
  playSound('click');
}

function setVoiceIdle() {
  const btn = DOM.voiceRecordBtn;
  if (!btn) return;
  btn.classList.remove('recording', 'processing');
  btn.querySelector('.voice-btn-icon').textContent = '🎤';
  btn.querySelector('.voice-btn-label').textContent = 'Записать голосом';
  btn.title = 'Записать ответ голосом';

  const status = DOM.voiceStatus;
  const charCount = DOM.aiUserAnswer.value.length;
  if (charCount > 0) {
    status.textContent = `Символов в ответе: ${charCount}`;
    status.classList.remove('hidden', 'recording-active', 'not-supported');
  } else {
    status.classList.add('hidden');
  }
}

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
  DOM.skipQBtn.addEventListener('click', skipQuestion);
  DOM.finishQuizBtn.addEventListener('click', () => { playSound('click'); finishQuiz(); });
  DOM.restartQuizBtn.addEventListener('click', () => { showScreen(DOM.startScreen); playSound('click'); });
  DOM.retryFailedBtn.addEventListener('click', startRetryFailedQuiz);
  DOM.quizExportPdfBtn.addEventListener('click', () => { playSound('click'); exportQuizToPDF(); });
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

  // Constructor Mode
  DOM.constructorModeBtn.addEventListener('click', () => {
    playSound('click');
    activeConstrCategory = 'all';
    selectedConstrIds.clear(); // Reset selections when opening constructor
    renderConstructorList();
    showScreen(DOM.constructorScreen);
  });
  DOM.constructorBackBtn.addEventListener('click', () => { playSound('click'); showScreen(DOM.startScreen); });
  DOM.constructorResultBackBtn.addEventListener('click', () => { playSound('click'); showScreen(DOM.constructorScreen); });
  DOM.constructorResultHomeBtn.addEventListener('click', () => { playSound('click'); showScreen(DOM.startScreen); });
  DOM.constructorExportPdfBtn.addEventListener('click', () => { playSound('click'); exportConstructorToPDF(); });
  DOM.constructorBuildBtn.addEventListener('click', buildConstructorResult);
  DOM.constrSelectAll.addEventListener('click', () => {
    // Add all visible questions in current filter to selectedConstrIds
    let pool = activeConstrCategory === 'all'
      ? questions
      : questions.filter(q => q.category === activeConstrCategory);
    const sv = DOM.constrSearchInput.value.toLowerCase().trim();
    if (sv) pool = pool.filter(q => q.question.toLowerCase().includes(sv) || (q.explanation||'').toLowerCase().includes(sv));
    pool.forEach(q => selectedConstrIds.add(q.id));
    renderConstructorList();
    playSound('click');
  });
  DOM.constrDeselectAll.addEventListener('click', () => {
    // Remove all visible questions in current filter from selectedConstrIds
    let pool = activeConstrCategory === 'all'
      ? questions
      : questions.filter(q => q.category === activeConstrCategory);
    const sv = DOM.constrSearchInput.value.toLowerCase().trim();
    if (sv) pool = pool.filter(q => q.question.toLowerCase().includes(sv) || (q.explanation||'').toLowerCase().includes(sv));
    pool.forEach(q => selectedConstrIds.delete(q.id));
    renderConstructorList();
    playSound('click');
  });
  document.querySelectorAll('.constr-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.constr-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeConstrCategory = btn.dataset.constrCat;
      renderConstructorList();
      playSound('click');
    });
  });

  DOM.constrSearchInput.addEventListener('input', renderConstructorList);

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
  // Hide ALL screens (including study and constructor screens)
  DOM.startScreen.classList.remove('active');
  DOM.quizScreen.classList.remove('active');
  DOM.resultsScreen.classList.remove('active');
  DOM.studyScreen.classList.remove('active');
  DOM.constructorScreen.classList.remove('active');
  DOM.constructorResultScreen.classList.remove('active');
  
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

  if (quizMode === 'exam' || quizMode === 'written_exam') {
    // EXAM / WRITTEN EXAM: 1 random question from each category = 3 total
    const categories = ['general', 'ai', 'practical'];
    categories.forEach(cat => {
      const pool = questions.filter(q => q.category === cat);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      rawQuestions.push(pool[0]);
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
  skippedQuestions = new Set();
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
  skippedQuestions = new Set();
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
  DOM.finishQuizBtn.classList.add('hidden');
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

  if (quizMode === 'ai' || quizMode === 'written_exam') {
    // Stop any ongoing voice recording before showing new question
    if (isRecording) {
      isRecording = false;
      clearVoiceRestartTimer();
      if (voiceSession) {
        try { voiceSession.abort(); } catch(e) {}
        voiceSession = null;
      }
    }
    voiceAccumulated = '';
    setVoiceIdle();

    // Show AI writing workspace, HIDE and CLEAR choices grid completely
    DOM.aiWriteContainer.classList.remove('hidden');
    DOM.optionsGrid.style.display = 'none';
    DOM.optionsGrid.innerHTML = '';
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

  // Update nav bar
  renderNavBar();

  // Render LaTeX math formulas
  triggerMathJax();
}

/**
 * Render the question number navigation bar.
 * Colors: current=primary, correct=green, wrong=red, exam-done=purple, skipped=orange, unanswered=gray
 */
function renderNavBar() {
  const bar = DOM.questionNavBar;
  bar.innerHTML = '';

  filteredQuestions.forEach((q, idx) => {
    const btn = document.createElement('button');
    btn.className = 'nav-q-btn';
    btn.textContent = idx + 1;

    const answer = userAnswers.find(a => a.questionId === q.id);
    const isSkipped = skippedQuestions.has(idx);

    if (idx === currentQuestionIndex) {
      btn.classList.add('nav-current');
    } else if (answer) {
      if (answer.selectedIndex === -1) {
        // AI/written mode - just show as done
        btn.classList.add('nav-done');
      } else if (answer.correct) {
        btn.classList.add('nav-correct');
      } else {
        btn.classList.add('nav-wrong');
      }
    } else if (isSkipped) {
      btn.classList.add('nav-skipped');
    }
    // else: default gray = unanswered

    btn.addEventListener('click', () => goToQuestion(idx));
    bar.appendChild(btn);
  });

  // Show/hide finish, next, and skip buttons dynamically
  const allAnswered = filteredQuestions.every(q => userAnswers.some(a => a.questionId === q.id));
  const isCurrentAnswered = userAnswers.some(a => a.questionId === filteredQuestions[currentQuestionIndex].id);

  if (allAnswered || filteredQuestions.length <= 1) {
    DOM.finishQuizBtn.classList.remove('hidden');
    DOM.nextQBtn.classList.add('hidden');
    DOM.skipQBtn.classList.add('hidden');
  } else {
    DOM.finishQuizBtn.classList.add('hidden');
    if (isCurrentAnswered) {
      DOM.nextQBtn.classList.remove('hidden');
      DOM.skipQBtn.classList.add('hidden');
    } else {
      DOM.nextQBtn.classList.add('hidden');
      DOM.skipQBtn.classList.remove('hidden');
    }
  }
}

/**
 * Jump to any question by index.
 * If already answered: restores the answered visual state (read-only).
 * If unanswered/skipped: shows fresh question.
 */
function goToQuestion(idx) {
  if (idx < 0 || idx >= filteredQuestions.length) return;
  playSound('click');
  currentQuestionIndex = idx;
  const q = filteredQuestions[idx];
  const answer = userAnswers.find(a => a.questionId === q.id);

  renderQuestion(); // resets everything to fresh state

  if (answer && answer.selectedIndex !== -1) {
    // Restore answered multiple-choice state
    const optionButtons = DOM.optionsGrid.querySelectorAll('.option-btn');
    optionButtons.forEach(btn => btn.disabled = true);

    if (quizMode === 'training') {
      if (answer.correct) {
        optionButtons[answer.selectedIndex].classList.add('correct');
        DOM.explanationBox.className = 'explanation-box correct-feedback';
        DOM.feedbackText.textContent = 'Правильно!';
        DOM.feedbackIcon.textContent = '✓';
      } else {
        optionButtons[answer.selectedIndex].classList.add('wrong');
        if (optionButtons[q.correctIndex ?? 0]) optionButtons[q.correctIndex ?? 0].classList.add('correct');
        DOM.explanationBox.className = 'explanation-box wrong-feedback';
        DOM.feedbackText.textContent = 'Неправильно';
        DOM.feedbackIcon.textContent = '✗';
      }
      DOM.explanationText.innerHTML = q.explanation ? markdownToHtml(q.explanation) : '';
      DOM.explanationBox.classList.remove('hidden');
      DOM.quizAskAiPanel.classList.remove('hidden');
    } else {
      // Exam mode: just highlight selected
      if (optionButtons[answer.selectedIndex]) {
        optionButtons[answer.selectedIndex].style.borderColor = 'var(--primary)';
        optionButtons[answer.selectedIndex].style.backgroundColor = 'var(--primary-glow)';
      }
    }
    // Automatically handled by renderNavBar() inside renderQuestion()
  }
  // If AI/written and answered — already handled by renderQuestion showing fresh (user can't re-answer)
}

/**
 * Skip current question and go to next unanswered, or if all done — enable finish.
 */
function skipQuestion() {
  playSound('click');
  skippedQuestions.add(currentQuestionIndex);

  // Find next unanswered question
  const nextUnanswered = findNextUnanswered(currentQuestionIndex);
  if (nextUnanswered !== -1) {
    currentQuestionIndex = nextUnanswered;
    renderQuestion();
  } else {
    // All answered or skipped — show finish
    renderNavBar();
    DOM.finishQuizBtn.classList.remove('hidden');
  }
}

/** Returns index of next unanswered (not in userAnswers) question after start, wrapping around. */
function findNextUnanswered(startIdx) {
  const total = filteredQuestions.length;
  for (let offset = 1; offset < total; offset++) {
    const idx = (startIdx + offset) % total;
    const q = filteredQuestions[idx];
    if (!userAnswers.some(a => a.questionId === q.id)) return idx;
  }
  return -1; // all answered
}

function handleOptionClick(selectedIdx) {

  const currentQuestion = filteredQuestions[currentQuestionIndex];
  
  // Disable all option buttons
  const optionButtons = DOM.optionsGrid.querySelectorAll('.option-btn');
  optionButtons.forEach(btn => btn.disabled = true);

  const isCorrect = (selectedIdx === (currentQuestion.correctIndex ?? 0));
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
      optionButtons[currentQuestion.correctIndex ?? 0].classList.add('correct');
      DOM.explanationBox.className = 'explanation-box wrong-feedback';
      DOM.feedbackText.textContent = 'Неправильно';
      DOM.feedbackIcon.textContent = '✗';
    }
    
    DOM.explanationText.innerHTML = currentQuestion.explanation ? markdownToHtml(currentQuestion.explanation) : '';
    DOM.explanationBox.classList.remove('hidden');
    DOM.nextQBtn.classList.remove('hidden');
    DOM.quizAskAiPanel.classList.remove('hidden'); // Show Ask AI
    renderNavBar();
    triggerMathJax();
  } else {
    // EXAM MODE: Highlight selection neutrally, NO hints or AI
    playSound('click');
    optionButtons[selectedIdx].style.borderColor = 'var(--primary)';
    optionButtons[selectedIdx].style.backgroundColor = 'var(--primary-glow)';
    
    DOM.nextQBtn.classList.remove('hidden');
    // DO NOT show Ask AI in exam mode — no hints allowed
    DOM.quizAskAiPanel.classList.add('hidden');
    renderNavBar();
  }
}

function overrideAsCorrect() {
  playSound('correct');
  score++;

  if (userAnswers.length > 0) {
    const lastAns = userAnswers[userAnswers.length - 1];
    lastAns.correct = true;
    if (lastAns.score !== undefined) {
      lastAns.score = 100;
    }
    lastAns.aiVerdict = 'Зачтено!';
    lastAns.aiCorrectText = 'Зачтено вручную пользователем.';
    lastAns.aiMissingText = '—';
    lastAns.aiCommentText = 'Пользователь переопределил оценку ИИ.';
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
  // Go to next unanswered, or just next, or finish
  const nextUnanswered = findNextUnanswered(currentQuestionIndex);
  if (nextUnanswered !== -1) {
    currentQuestionIndex = nextUnanswered;
    renderQuestion();
  } else {
    // All answered
    DOM.finishQuizBtn.classList.remove('hidden');
    renderNavBar();
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
  } else if (quizMode === 'written_exam') {
    DOM.resultMode.textContent = 'Письменный экзамен';
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
      card.className = 'wrong-answer-card tex2jax_process';
      
      if (answer.selectedIndex === -1) {
        // AI Oral Exam response formatting
        const correctText = answer.aiCorrectText ? markdownToHtml(answer.aiCorrectText) : 'Нет данных';
        const missingText = answer.aiMissingText ? markdownToHtml(answer.aiMissingText) : 'Нет данных';
        const commentText = answer.aiCommentText ? markdownToHtml(answer.aiCommentText) : 'Нет комментариев';
        
        card.innerHTML = `
          <h4>${q.question}</h4>
          <div style="display: flex; gap: 10px; margin: 8px 0; flex-wrap: wrap;">
            <span class="badge" style="background: rgba(248, 113, 113, 0.15); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); font-size: 0.75rem;">Оценка ИИ: ${answer.score}%</span>
            <span class="badge" style="background: rgba(248, 113, 113, 0.15); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); font-size: 0.75rem;">${answer.aiVerdict || 'Не зачтено'}</span>
          </div>
          <div style="margin: 10px 0; padding: 10px; background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.05);">
            <strong style="color:var(--text-secondary); font-size:0.85rem;">📝 Ваш ответ:</strong>
            <p style="margin-top: 5px; font-style: italic; color: var(--text-muted); font-size:0.9rem;">${answer.userAnswerText}</p>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px; font-size:0.88rem;">
            <div style="border-left: 2px solid var(--correct); padding-left: 10px;">
              <strong style="color:var(--correct);">✓ Что отвечено правильно:</strong>
              <p style="margin-top: 2px; color: var(--text-secondary);">${correctText}</p>
            </div>
            <div style="border-left: 2px solid var(--wrong); padding-left: 10px;">
              <strong style="color:var(--wrong);">✗ Что упущено или требует доработки:</strong>
              <p style="margin-top: 2px; color: var(--text-secondary);">${missingText}</p>
            </div>
            <div style="border-left: 2px solid var(--primary); padding-left: 10px;">
              <strong style="color:var(--primary-hover);">💬 Комментарий экзаменатора:</strong>
              <p style="margin-top: 2px; color: var(--text-secondary);">${commentText}</p>
            </div>
          </div>
          <p class="reason" style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
            <strong>📚 Эталонный академический ответ:</strong><br>
            <span>${q.explanation ? markdownToHtml(q.explanation) : ''}</span>
          </p>
        `;
      } else {
        // Standard choice wrong answer
        card.innerHTML = `
          <h4>${q.question}</h4>
          <div class="wrong-answer-choice">❌ Ваш ответ: <strong>${q.options[answer.selectedIndex]}</strong></div>
          <div class="correct-answer-choice">✓ Правильный ответ: <strong>${q.options[q.correctIndex]}</strong></div>
          <p class="reason">${q.explanation ? markdownToHtml(q.explanation) : ''}</p>
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
      userAnswerText: answerText,
      aiCorrectText: data.what_is_correct || '',
      aiMissingText: data.what_is_missing || '',
      aiCommentText: data.explanation || '',
      aiVerdict: verdictText
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
    DOM.aiCorrectText.innerHTML = data.what_is_correct ? markdownToHtml(data.what_is_correct) : 'Нет данных';
    DOM.aiMissingText.innerHTML = data.what_is_missing ? markdownToHtml(data.what_is_missing) : 'Нет данных';
    DOM.aiCommentText.innerHTML = data.explanation ? markdownToHtml(data.explanation) : 'Нет комментариев';

    // Populate academic etalon
    DOM.academicAnswerText.innerHTML = currentQuestion.explanation ? markdownToHtml(currentQuestion.explanation) : '';

    // Show result card
    DOM.aiResultBox.classList.remove('hidden');

    // Show Ask AI panel so user can ask follow-up questions
    DOM.quizAskAiPanel.classList.remove('hidden');
    
    // Dynamically update next/finish buttons
    renderNavBar();

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
      userAnswerText: answerText,
      aiCorrectText: 'Не удалось завершить автоматическую проверку ИИ.',
      aiMissingText: error.message || 'Возможно, отсутствует подключение к сети или не задан API-ключ в переменных окружения.',
      aiCommentText: 'Вы можете продолжить тест, нажав кнопку «Дальше» или принудительно засчитать ответ.',
      aiVerdict: 'Ошибка'
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

    // Show Ask AI panel so user can ask follow-up questions
    DOM.quizAskAiPanel.classList.remove('hidden');
    
    // Dynamically update next/finish buttons
    renderNavBar();

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
      const explanationMatch = (q.explanation || '').toLowerCase().includes(searchVal);
      const optionsMatch = Array.isArray(q.options) && q.options.some(opt => opt.toLowerCase().includes(searchVal));
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
      const isCorrect = optIdx === (q.correctIndex ?? 0);
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
        <span class="tex2jax_process">${q.explanation ? markdownToHtml(q.explanation) : ''}</span>
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

  const correctOption = q.options ? q.options[q.correctIndex ?? 0] : '';
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
    ? currentQuestion.options[currentQuestion.correctIndex ?? 0]
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
 * Lightweight Markdown → HTML converter with $$...$$ math block support.
 */
function markdownToHtml(md) {
  if (!md) return '';

  const lines = md.split('\n');
  const output = [];
  let inList = false;
  let inCodeBlock = false;
  let inMathBlock = false;
  let inTable = false;
  let tableRows = [];
  let codeLines = [];
  let mathLines = [];

  const closeList = () => {
    if (inList) { output.push('</ul>'); inList = false; }
  };

  const closeTable = () => {
    if (inTable && tableRows.length > 0) {
      let tableHtml = '<div class="ai-table-container"><table class="ai-table">';
      const isSeparator = (rowText) => {
        return /^[|\s:-]+$/.test(rowText) && rowText.includes('-');
      };
      
      let hasHeader = false;
      let bodyRows = [];
      let headerCells = [];
      
      tableRows.forEach((row, rIdx) => {
        let cleanRow = row.trim();
        if (cleanRow.startsWith('|')) cleanRow = cleanRow.slice(1);
        if (cleanRow.endsWith('|')) cleanRow = cleanRow.slice(0, -1);
        
        const cells = cleanRow.split('|').map(c => c.trim());
        
        if (rIdx === 0) {
          headerCells = cells;
          hasHeader = true;
        } else if (isSeparator(row)) {
          // skip separator row
        } else {
          bodyRows.push(cells);
        }
      });
      
      if (hasHeader) {
        tableHtml += '<thead><tr>';
        headerCells.forEach(cell => {
          tableHtml += `<th>${processInline(cell)}</th>`;
        });
        tableHtml += '</tr></thead>';
      }
      
      tableHtml += '<tbody>';
      bodyRows.forEach(cells => {
        tableHtml += '<tr>';
        cells.forEach(cell => {
          tableHtml += `<td>${processInline(cell)}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table></div>';
      
      output.push(tableHtml);
      inTable = false;
      tableRows = [];
    }
  };

  const processInline = (text) => {
    // Preserve inline math $...$ by replacing with placeholders first
    const mathPlaceholders = [];
    text = text.replace(/\$([^$\n]+?)\$/g, (match) => {
      mathPlaceholders.push(match);
      return `\x00MATH${mathPlaceholders.length - 1}\x00`;
    });

    // Escape HTML
    text = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold+italic, bold, italic, inline code
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/`([^`]+)`/g, '<code class="ai-code-inline">$1</code>');

    // Restore inline math placeholders (no HTML escaping inside)
    text = text.replace(/\x00MATH(\d+)\x00/g, (_, idx) => mathPlaceholders[parseInt(idx)]);

    return text;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Display math block $$...$$
    if (trimmed === '$$') {
      if (!inMathBlock) {
        closeList();
        closeTable();
        inMathBlock = true;
        mathLines = [];
      } else {
        inMathBlock = false;
        // Emit as a single block that MathJax can process
        output.push(`<div class="ai-math-block">$$${mathLines.join('\n')}$$</div>`);
        mathLines = [];
      }
      continue;
    }
    if (inMathBlock) {
      mathLines.push(line);
      continue;
    }

    // Code block fence ```
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        closeList();
        closeTable();
        inCodeBlock = true;
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

    // Markdown Table check
    const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|');
    if (isTableRow) {
      closeList();
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(line);
      continue;
    } else {
      closeTable();
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
  closeTable();
  return output.join('\n');
}

/* ==========================================================================
   CONSTRUCTOR MODE
   ========================================================================== */

/**
 * Render the checklist of questions in the constructor screen,
 * filtered by the currently active category.
 */
function renderConstructorList() {
  const list = DOM.constructorList;
  list.innerHTML = '';

  const searchVal = DOM.constrSearchInput.value.toLowerCase().trim();

  let pool = activeConstrCategory === 'all'
    ? questions
    : questions.filter(q => q.category === activeConstrCategory);

  if (searchVal) {
    pool = pool.filter(q => {
      const qMatch = q.question.toLowerCase().includes(searchVal);
      const eMatch = (q.explanation || '').toLowerCase().includes(searchVal);
      const oMatch = Array.isArray(q.options) && q.options.some(o => o.toLowerCase().includes(searchVal));
      return qMatch || eMatch || oMatch;
    });
  }

  const catLabels = { general: 'Общие ИТ/ИБ', ai: 'ИИ', practical: 'Практика' };

  if (pool.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);padding:20px;text-align:center;">🔍 Вопросы не найдены</p>';
    updateConstrCount();
    return;
  }

  pool.forEach(q => {
    const row = document.createElement('label');
    row.className = 'constr-row';
    const isChecked = selectedConstrIds.has(q.id);
    row.innerHTML = `
      <input type="checkbox" class="constr-checkbox" data-id="${q.id}" data-cat="${q.category}" ${isChecked ? 'checked' : ''} />
      <span class="constr-badge">${catLabels[q.category] || q.category}</span>
      <span class="constr-question-text">${q.id}. ${q.question}</span>
    `;
    const cb = row.querySelector('.constr-checkbox');
    cb.addEventListener('change', () => {
      if (cb.checked) {
        selectedConstrIds.add(q.id);
      } else {
        selectedConstrIds.delete(q.id);
      }
      updateConstrCount();
    });
    list.appendChild(row);
  });

  updateConstrCount();
}

/** Update the "N выбрано" badge */
function updateConstrCount() {
  const count = selectedConstrIds.size;
  DOM.constrCountBadge.textContent = `${count} выбрано`;
  DOM.constructorBuildBtn.disabled = count === 0;
}

/**
 * Build the result screen showing selected questions with correct answers.
 */
function buildConstructorResult() {
  const selectedIds = [...selectedConstrIds];

  if (selectedIds.length === 0) {
    alert('Выберите хотя бы один вопрос!');
    return;
  }

  playSound('click');

  const selectedQuestions = questions.filter(q => selectedIds.includes(q.id));
  const catLabels = { general: 'Общие ИТ/ИБ', ai: 'ИИ', practical: 'Практика' };

  DOM.constrResultSubtitle.textContent = `Подборка из ${selectedQuestions.length} вопроса(-ов)`;
  DOM.constructorResultList.innerHTML = '';

  selectedQuestions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'study-card';
    card.style.border = '1px solid rgba(167,139,250,0.25)';

    // Build options list (if available)
    let optionsHtml = '';
    if (Array.isArray(q.options)) {
      optionsHtml = '<div class="constr-options-list">' +
        q.options.map((opt, i) => {
          const isCorrect = i === (q.correctIndex ?? 0);
          return `<div class="study-option${isCorrect ? ' correct' : ''}">
            <span class="option-indicator">${String.fromCharCode(65 + i)}</span>
            <span>${opt}</span>
            ${isCorrect ? '<span style="margin-left:auto; color:var(--correct); font-weight:700;">✓</span>' : ''}
          </div>`;
        }).join('') +
      '</div>';
    }

    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
        <span class="badge">${catLabels[q.category] || q.category}</span>
        <span style="color:var(--text-muted); font-size:0.85rem;">Вопрос №${q.id}</span>
      </div>
      <h3 class="tex2jax_process" style="font-size:1rem; font-weight:700; margin-bottom:14px; line-height:1.5;">
        ${q.question}
      </h3>
      ${optionsHtml}
      <div class="study-explanation tex2jax_process" style="margin-top:12px;">
        <strong style="color:var(--correct);">✓ Правильный ответ:</strong>
        <p style="margin-top:6px;">${q.explanation ? markdownToHtml(q.explanation) : ''}</p>
      </div>
    `;
    // --- Ask AI panel ---
    const aiPanelId = `constr-ai-${q.id}`;
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

    DOM.constructorResultList.appendChild(card);
  });

  triggerMathJax();
  showScreen(DOM.constructorResultScreen);
}

/**
 * Export the selected questions to PDF via a clean print window.
 * Opens a new tab with styled HTML and auto-triggers browser print dialog.
 */
function exportConstructorToPDF() {
  const selectedIds = [...selectedConstrIds];
  if (selectedIds.length === 0) {
    alert('Нет выбранных вопросов для экспорта.');
    return;
  }

  const selectedQuestions = questions.filter(q => selectedIds.includes(q.id));
  const catLabels = { general: 'Общие ИТ/ИБ темы', ai: 'Искусственный интеллект', practical: 'Практические задачи' };
  const dateStr = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  let questionsHtml = '';
  selectedQuestions.forEach((q, idx) => {
    let optionsHtml = '';
    if (Array.isArray(q.options)) {
      optionsHtml = q.options.map((opt, i) => {
        const isCorrect = i === (q.correctIndex ?? 0);
        return `<div class="opt ${isCorrect ? 'opt-correct' : ''}">
          <span class="opt-letter">${String.fromCharCode(65 + i)}.</span>
          <span class="opt-text">${opt}</span>
          ${isCorrect ? '<span class="opt-check">✓</span>' : ''}
        </div>`;
      }).join('');
    }

    const explanation = q.explanation ? markdownToHtml(q.explanation) : '';

    // Capture AI response from DOM if user asked a question
    const aiPanelId = `constr-ai-${q.id}`;
    const aiResponseEl = document.getElementById(`${aiPanelId}-response`);
    const aiInputEl = document.getElementById(`${aiPanelId}-input`);
    let aiHtml = '';
    if (aiResponseEl && !aiResponseEl.classList.contains('hidden') && aiResponseEl.innerHTML.trim()) {
      const userQ = aiInputEl ? aiInputEl.value.trim() : '';
      aiHtml = `
        <div class="q-ai-block">
          <div class="q-ai-title">🤖 Ответ ИИ-ассистента</div>
          ${userQ ? `<div class="q-ai-question">Вопрос: <em>${userQ}</em></div>` : ''}
          <div class="q-ai-body">${aiResponseEl.innerHTML}</div>
        </div>`;
    }

    questionsHtml += `
      <div class="q-block">
        <div class="q-meta">
          <span class="q-num">Вопрос ${idx + 1}</span>
          <span class="q-cat">${catLabels[q.category] || q.category}</span>
        </div>
        <div class="q-text">${q.question}</div>
        ${optionsHtml ? `<div class="q-options">${optionsHtml}</div>` : ''}
        <div class="q-answer">
          <strong>Правильный ответ:</strong>
          <div class="q-explanation">${explanation}</div>
        </div>
        ${aiHtml}
      </div>
    `;
  });

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Подборка вопросов — ${dateStr}</title>
  <script>
    window.MathJax = { tex: { inlineMath: [['$','$'],['\\\\(','\\\\)']] } };
  <\/script>
  <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      color: #1a1a2e;
      padding: 20mm 18mm;
      line-height: 1.6;
    }
    /* Markdown Styles for PDF */
    .ai-p { margin: 4px 0; }
    .ai-h3 { font-size: 11pt; font-weight: 700; margin: 12px 0 4px; color: #7c3aed; }
    .ai-h2 { font-size: 12pt; font-weight: 700; margin: 14px 0 6px; color: #7c3aed; }
    .ai-h1 { font-size: 13pt; font-weight: 700; margin: 16px 0 8px; color: #7c3aed; }
    .ai-list { margin: 6px 0 6px 20px; padding-left: 6px; }
    .ai-list li { margin: 3px 0; }
    .ai-code-inline { background: rgba(124, 58, 237, 0.08); border: 1px solid rgba(124, 58, 237, 0.2); padding: 1px 4px; border-radius: 4px; font-family: monospace; font-size: 9.5pt; }
    .ai-code-block { background: #f3f4f6; border: 1px solid #ddd; border-radius: 6px; padding: 10px 14px; margin: 8px 0; font-family: monospace; font-size: 9pt; white-space: pre-wrap; }
    .ai-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9.5pt; background: #f9f9fb; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
    .ai-table th, .ai-table td { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; }
    .ai-table th { background: #ede9fe; color: #5b21b6; font-weight: 700; }
    .ai-table tr:hover { background: #f3f4f6; }
    .pdf-header {
      border-bottom: 2px solid #7c3aed;
      padding-bottom: 10px;
      margin-bottom: 24px;
    }
    .pdf-header h1 { font-size: 16pt; color: #7c3aed; }
    .pdf-header p { font-size: 9pt; color: #555; margin-top: 4px; }
    .q-block {
      margin-bottom: 22px;
      padding: 14px 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
      page-break-inside: avoid;
    }
    .q-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .q-num {
      font-weight: 700;
      font-size: 9pt;
      color: #7c3aed;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .q-cat {
      font-size: 8.5pt;
      background: #ede9fe;
      color: #5b21b6;
      border-radius: 20px;
      padding: 1px 8px;
    }
    .q-text {
      font-size: 11pt;
      font-weight: 600;
      margin-bottom: 10px;
      line-height: 1.5;
    }
    .q-options { margin-bottom: 10px; }
    .opt {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 5px;
      font-size: 10pt;
      margin-bottom: 3px;
    }
    .opt-correct {
      background: #dcfce7;
      font-weight: 600;
    }
    .opt-letter { color: #6b7280; font-weight: 700; min-width: 16px; }
    .opt-check { color: #16a34a; font-weight: 900; margin-left: auto; }
    .q-answer {
      background: #f5f3ff;
      border-left: 3px solid #7c3aed;
      padding: 8px 12px;
      border-radius: 0 6px 6px 0;
      font-size: 10pt;
    }
    .q-answer strong { color: #5b21b6; }
    .q-explanation { margin-top: 4px; color: #374151; line-height: 1.5; }
    .q-ai-block {
      margin-top: 10px;
      background: #ecfdf5;
      border-left: 3px solid #059669;
      padding: 8px 12px;
      border-radius: 0 6px 6px 0;
      font-size: 10pt;
    }
    .q-ai-title {
      font-weight: 700;
      color: #047857;
      margin-bottom: 4px;
      font-size: 9.5pt;
    }
    .q-ai-question {
      color: #374151;
      font-size: 9pt;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px dashed #a7f3d0;
    }
    .q-ai-body { color: #1f2937; line-height: 1.55; }
    .q-ai-body strong { color: #065f46; }
    .q-ai-body em { color: #047857; }
    .q-ai-body ul, .q-ai-body ol { margin: 4px 0 4px 18px; }
    .pdf-footer {
      margin-top: 30px;
      border-top: 1px solid #ccc;
      padding-top: 8px;
      font-size: 8pt;
      color: #888;
      text-align: center;
    }
    @media print {
      body { padding: 15mm 14mm; }
      .q-block { break-inside: avoid; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="pdf-header">
    <h1>📚 Подборка вопросов к государственному экзамену</h1>
    <p>Сформировано: ${dateStr} &nbsp;|&nbsp; Вопросов: ${selectedQuestions.length}</p>
  </div>
  ${questionsHtml}
  <div class="pdf-footer">Сформировано автоматически системой подготовки к госэкзамену</div>
  <script>
    // Wait for MathJax then print
    if (window.MathJax) {
      MathJax.startup.promise.then(() => { window.print(); });
    } else {
      setTimeout(() => window.print(), 1200);
    }
  <\/script>
</body>
</html>`;

  const printWin = window.open('', '_blank');
  printWin.document.write(html);
  printWin.document.close();
}

/**
 * Export the completed quiz results to PDF via a clean print window.
 */
function exportQuizToPDF() {
  if (userAnswers.length === 0) {
    alert('Нет результатов ответов для экспорта.');
    return;
  }

  const dateStr = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = formatTime(totalTimeTaken);
  const correctCount = score;
  const totalCount = filteredQuestions.length;
  const percentage = Math.round((correctCount / totalCount) * 100);
  const verdictText = getScoreVerdict(percentage);

  let modeText = 'Тренировка';
  if (quizMode === 'exam') modeText = 'Экзамен';
  else if (quizMode === 'ai') modeText = 'Устный ответ (ИИ)';
  else if (quizMode === 'written_exam') modeText = 'Письменный экзамен';

  const catText = getCategoryLabel(activeCategory);

  let questionsHtml = '';
  filteredQuestions.forEach((q, idx) => {
    const ans = userAnswers.find(a => a.questionId === q.id);
    let userAnsHtml = '';
    let statusBadge = '';

    if (!ans) {
      statusBadge = `<span class="badge badge-skip">Пропущено</span>`;
      userAnsHtml = `<div class="ans-block skipped">Вопрос был пропущен без ответа.</div>`;
    } else if (ans.selectedIndex === -1) {
      // AI oral question
      statusBadge = ans.correct 
        ? `<span class="badge badge-correct">Зачтено (${ans.score}%)</span>` 
        : `<span class="badge badge-wrong">Не зачтено (${ans.score}%)</span>`;

      const correctText = ans.aiCorrectText ? markdownToHtml(ans.aiCorrectText) : '—';
      const missingText = ans.aiMissingText ? markdownToHtml(ans.aiMissingText) : '—';
      const commentText = ans.aiCommentText ? markdownToHtml(ans.aiCommentText) : '—';

      userAnsHtml = `
        <div class="ans-block oral">
          <div class="user-typed-ans">
            <strong>Ваш ответ:</strong>
            <p><em>${ans.userAnswerText || '(пустой ответ)'}</em></p>
          </div>
          <div class="ai-assessment-details">
            <div class="assessment-item correct">
              <strong>✓ Что отвечено правильно:</strong>
              <p>${correctText}</p>
            </div>
            <div class="assessment-item missing">
              <strong>✗ Что упущено или требует доработки:</strong>
              <p>${missingText}</p>
            </div>
            <div class="assessment-item comment">
              <strong>💬 Комментарий экзаменатора:</strong>
              <p>${commentText}</p>
            </div>
          </div>
        </div>`;
    } else {
      // Multiple-choice question
      statusBadge = ans.correct 
        ? `<span class="badge badge-correct">Правильно</span>` 
        : `<span class="badge badge-wrong">Неправильно</span>`;

      let optionsHtml = '';
      if (Array.isArray(q.options)) {
        optionsHtml = q.options.map((opt, i) => {
          const isUserChoice = i === ans.selectedIndex;
          const isCorrect = i === (q.correctIndex ?? 0);
          let optClass = '';
          if (isCorrect) optClass = 'opt-correct';
          else if (isUserChoice) optClass = 'opt-wrong';

          return `<div class="opt ${optClass}">
            <span class="opt-letter">${String.fromCharCode(65 + i)}.</span>
            <span class="opt-text">${opt}</span>
            ${isCorrect ? '<span class="opt-check">✓</span>' : ''}
            ${isUserChoice && !isCorrect ? '<span class="opt-cross">✗</span>' : ''}
          </div>`;
        }).join('');
      }
      userAnsHtml = `<div class="q-options">${optionsHtml}</div>`;
    }

    const explanation = q.explanation ? markdownToHtml(q.explanation) : '';

    questionsHtml += `
      <div class="q-block">
        <div class="q-meta">
          <span class="q-num">Вопрос ${idx + 1}</span>
          <span class="q-cat">${getCategoryLabel(q.category)}</span>
          ${statusBadge}
        </div>
        <div class="q-text">${q.question}</div>
        ${userAnsHtml}
        <div class="q-answer">
          <strong>Решение / Разбор:</strong>
          <div class="q-explanation">${explanation}</div>
        </div>
      </div>
    `;
  });

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Отчет о результатах тестирования — ${dateStr}</title>
  <script>
    window.MathJax = { tex: { inlineMath: [['$','$'],['\\\\(','\\\\)']] } };
  <\/script>
  <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 10.5pt;
      color: #1a1a2e;
      padding: 20mm 18mm;
      line-height: 1.5;
    }
    /* Markdown Styles for PDF */
    .ai-p { margin: 4px 0; }
    .ai-h3 { font-size: 10.5pt; font-weight: 700; margin: 12px 0 4px; color: #7c3aed; }
    .ai-h2 { font-size: 11.5pt; font-weight: 700; margin: 14px 0 6px; color: #7c3aed; }
    .ai-h1 { font-size: 12.5pt; font-weight: 700; margin: 16px 0 8px; color: #7c3aed; }
    .ai-list { margin: 6px 0 6px 20px; padding-left: 6px; }
    .ai-list li { margin: 3px 0; }
    .ai-code-inline { background: rgba(124, 58, 237, 0.08); border: 1px solid rgba(124, 58, 237, 0.2); padding: 1px 4px; border-radius: 4px; font-family: monospace; font-size: 9.5pt; }
    .ai-code-block { background: #f3f4f6; border: 1px solid #ddd; border-radius: 6px; padding: 10px 14px; margin: 8px 0; font-family: monospace; font-size: 9pt; white-space: pre-wrap; }
    .ai-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9.5pt; background: #f9f9fb; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
    .ai-table th, .ai-table td { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; }
    .ai-table th { background: #ede9fe; color: #5b21b6; font-weight: 700; }
    .ai-table tr:hover { background: #f3f4f6; }
    .pdf-header {
      border-bottom: 2px solid #7c3aed;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .pdf-header h1 { font-size: 15pt; color: #7c3aed; }
    .pdf-stats-row {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-top: 8px;
      font-size: 8.5pt;
      color: #555;
    }
    .stat-badge {
      background: #f3f4f6;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    }
    .q-block {
      margin-bottom: 22px;
      padding: 14px 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
      page-break-inside: avoid;
    }
    .q-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .q-num {
      font-weight: 700;
      font-size: 8.5pt;
      color: #7c3aed;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .q-cat {
      font-size: 8pt;
      background: #ede9fe;
      color: #5b21b6;
      border-radius: 20px;
      padding: 1px 8px;
    }
    .badge {
      font-size: 8pt;
      font-weight: 700;
      border-radius: 4px;
      padding: 2px 8px;
      margin-left: auto;
    }
    .badge-correct { background: #dcfce7; color: #16a34a; }
    .badge-wrong { background: #fee2e2; color: #dc2626; }
    .badge-skip { background: #fef3c7; color: #d97706; }
    .q-text {
      font-size: 10.5pt;
      font-weight: 600;
      margin-bottom: 10px;
      line-height: 1.4;
    }
    .ans-block {
      margin-bottom: 10px;
      padding: 10px;
      border-radius: 6px;
      font-size: 9.5pt;
    }
    .ans-block.skipped { background: #fffbeb; border: 1px solid #fde68a; color: #b45309; }
    .user-typed-ans {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .user-typed-ans strong { color: #4b5563; font-size: 8.5pt; }
    .user-typed-ans p { font-style: italic; color: #374151; margin-top: 2px; }
    .ai-assessment-details {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .assessment-item {
      border-left: 2px solid #ccc;
      padding-left: 8px;
      margin-left: 2px;
    }
    .assessment-item.correct { border-left-color: #10b981; }
    .assessment-item.correct strong { color: #047857; font-size: 8.5pt; }
    .assessment-item.missing { border-left-color: #ef4444; }
    .assessment-item.missing strong { color: #b91c1c; font-size: 8.5pt; }
    .assessment-item.comment { border-left-color: #6366f1; }
    .assessment-item.comment strong { color: #4338ca; font-size: 8.5pt; }
    .assessment-item p { font-size: 9pt; color: #1f2937; margin-top: 1px; }
    
    .q-options { margin-bottom: 10px; }
    .opt {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 5px;
      font-size: 9.5pt;
      margin-bottom: 3px;
    }
    .opt-correct { background: #dcfce7; font-weight: 600; }
    .opt-wrong { background: #fee2e2; }
    .opt-letter { color: #6b7280; font-weight: 700; min-width: 16px; }
    .opt-check { color: #16a34a; font-weight: 900; margin-left: auto; }
    .opt-cross { color: #dc2626; font-weight: 900; margin-left: auto; }
    
    .q-answer {
      background: #f5f3ff;
      border-left: 3px solid #7c3aed;
      padding: 8px 12px;
      border-radius: 0 6px 6px 0;
      font-size: 9.5pt;
      margin-top: 10px;
    }
    .q-answer strong { color: #5b21b6; }
    .q-explanation { margin-top: 4px; color: #374151; line-height: 1.45; }
    
    .pdf-footer {
      margin-top: 24px;
      border-top: 1px solid #ccc;
      padding-top: 8px;
      font-size: 8pt;
      color: #888;
      text-align: center;
    }
    @media print {
      body { padding: 15mm 14mm; }
      .q-block { break-inside: avoid; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="pdf-header">
    <h1>📊 Отчет о результатах тестирования</h1>
    <div class="pdf-stats-row">
      <span class="stat-badge">Дата: <strong>${dateStr}</strong></span>
      <span class="stat-badge">Режим: <strong>${modeText}</strong></span>
      <span class="stat-badge">Раздел: <strong>${catText}</strong></span>
      <span class="stat-badge">Время: <strong>${timeStr}</strong></span>
      <span class="stat-badge">Баллы: <strong>${correctCount} / ${totalCount} (${percentage}%)</strong></span>
      <span class="stat-badge">Вердикт: <strong>${verdictText}</strong></span>
    </div>
  </div>
  ${questionsHtml}
  <div class="pdf-footer">Сформировано автоматически системой подготовки к госэкзамену</div>
  <script>
    if (window.MathJax) {
      MathJax.startup.promise.then(() => { window.print(); });
    } else {
      setTimeout(() => window.print(), 1200);
    }
  <\/script>
</body>
</html>`;

  const printWin = window.open('', '_blank');
  printWin.document.write(html);
  printWin.document.close();
}


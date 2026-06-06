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
  homeBtn: document.getElementById('home-btn'),
  
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
  confirmCancelBtn: document.getElementById('confirm-cancel-btn')
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
  DOM.homeBtn.addEventListener('click', () => { showScreen(DOM.startScreen); playSound('click'); });
}

function showScreen(screen) {
  // Hide all screens
  DOM.startScreen.classList.remove('active');
  DOM.quizScreen.classList.remove('active');
  DOM.resultsScreen.classList.remove('active');
  
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
  
  // 1. Filter Questions
  let rawQuestions = [];
  if (activeCategory === 'all') {
    rawQuestions = [...questions];
  } else {
    rawQuestions = questions.filter(q => q.category === activeCategory);
  }

  // Map each question to a new object with dynamically shuffled options
  filteredQuestions = rawQuestions.map(q => shuffleQuestionOptions(q));

  // Shuffle questions array for exam mode to prevent rote learning
  if (quizMode === 'exam') {
    filteredQuestions.sort(() => Math.random() - 0.5);
  }

  if (filteredQuestions.length === 0) {
    alert("В выбранном разделе нет вопросов!");
    return;
  }

  // 2. Initialize State
  currentQuestionIndex = 0;
  score = 0;
  userAnswers = [];
  timeLeft = 25 * 60; // 25 mins
  quizStartTime = Date.now();

  // 3. Configure Layout Mode
  if (quizMode === 'exam') {
    DOM.examTimer.classList.remove('hidden');
    DOM.nextQBtn.textContent = 'Дальше';
    startTimer();
  } else {
    DOM.examTimer.classList.add('hidden');
    DOM.nextQBtn.textContent = 'Дальше';
    stopTimer();
  }

  // 4. Render First Question
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

  // Render Options
  DOM.optionsGrid.innerHTML = '';
  currentQuestion.options.forEach((option, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    
    // Convert math expressions in options to display nicely
    btn.innerHTML = `
      <span>${option}</span>
      <span class="option-indicator">${String.fromCharCode(65 + idx)}</span>
    `;
    
    btn.addEventListener('click', () => handleOptionClick(idx));
    DOM.optionsGrid.appendChild(btn);
  });

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
    triggerMathJax();
  } else {
    // EXAM MODE: Highlight selection neutrally, auto-advance or show next
    playSound('click');
    optionButtons[selectedIdx].style.borderColor = 'var(--primary)';
    optionButtons[selectedIdx].style.backgroundColor = 'var(--primary-glow)';
    
    // In exam mode we immediately advance or show "Next"
    // Let's show "Next" so they have a visual verification that they selected, then click next
    DOM.nextQBtn.classList.remove('hidden');
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

  DOM.resultMode.textContent = quizMode === 'training' ? 'Тренировка' : 'Экзамен';
  DOM.resultCategory.textContent = getCategoryLabel(activeCategory);
  DOM.resultTime.textContent = formatTime(totalTimeTaken);
  DOM.resultCorrect.textContent = correctCount;
  DOM.resultWrong.textContent = wrongCount;

  // Build wrong answers analysis list
  DOM.wrongAnswersList.innerHTML = '';
  const wrongUserAnswers = userAnswers.filter(a => !a.correct);

  if (wrongUserAnswers.length === 0) {
    DOM.wrongAnswersList.innerHTML = `
      <div style="text-align:center; padding: 20px; color: var(--correct)">
        🎉 Великолепно! Вы ответили на все вопросы правильно!
      </div>
    `;
  } else {
    wrongUserAnswers.forEach(answer => {
      const q = filteredQuestions.find(item => item.id === answer.questionId);
      const card = document.createElement('div');
      card.className = 'wrong-answer-card';
      
      card.innerHTML = `
        <h4>${q.question}</h4>
        <div class="wrong-answer-choice">❌ Ваш ответ: <strong>${q.options[answer.selectedIndex]}</strong></div>
        <div class="correct-answer-choice">✓ Правильный ответ: <strong>${q.options[q.correctIndex]}</strong></div>
        <p class="reason">${q.explanation}</p>
      `;
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

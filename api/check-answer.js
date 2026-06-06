// Strip non-ASCII characters to prevent "ByteString" header errors
// (can happen when .env is saved with UTF-16 BOM on Windows)
function cleanKey(val) {
  return (val || '').replace(/[^\x20-\x7E]/g, '').trim();
}

const AITUNNEL_KEY = cleanKey(process.env.AITUNNEL_API_KEY);
const DEEPSEEK_KEY = cleanKey(process.env.DEEPSEEK_API_KEY);
const GEMINI_KEY   = cleanKey(process.env.GEMINI_API_KEY);

// Startup diagnostic
console.log('[check-answer] Keys loaded:');
console.log('  AITUNNEL_API_KEY length:', AITUNNEL_KEY.length, AITUNNEL_KEY ? `(starts: ${AITUNNEL_KEY.slice(0,6)}...)` : '(empty)');
console.log('  DEEPSEEK_API_KEY length:', DEEPSEEK_KEY.length);
console.log('  GEMINI_API_KEY   length:', GEMINI_KEY.length);

module.exports = async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { question, etalon, userAnswer, userQuestion } = req.body;

  if (!question || !etalon || (userAnswer === undefined && userQuestion === undefined)) {
    return res.status(400).json({ error: 'Missing required fields: question, etalon, and either userAnswer or userQuestion.' });
  }

  // Detect configured API provider by priority
  let provider = '';
  let apiKey = '';

  if (AITUNNEL_KEY) {
    provider = 'aitunnel';
    apiKey = AITUNNEL_KEY;
  } else if (DEEPSEEK_KEY) {
    provider = 'deepseek';
    apiKey = DEEPSEEK_KEY;
  } else if (GEMINI_KEY) {
    provider = 'gemini';
    apiKey = GEMINI_KEY;
  } else {
    return res.status(500).json({ 
      error: 'API-ключи не настроены на сервере. Пожалуйста, задайте AITUNNEL_API_KEY, DEEPSEEK_API_KEY или GEMINI_API_KEY в переменных окружения (в файле .env).' 
    });
  }

  let promptText = '';
  if (userQuestion) {
    promptText = `Ты — преподаватель-ассистент на Государственном экзамене по направлению "АПИб-22 (Прикладная информатика, искусственный интеллект)".
Студент изучает следующий экзаменационный вопрос и хочет получить разъяснение:

Вопрос билета: ${question}
Эталонный ответ / решение: ${etalon}

Студент задал вопрос: "${userQuestion}"

Ответь студенту на его вопрос подробно, доступным языком, при необходимости приведи математические выкладки или примеры. Если его вопрос не связан с темой билета, вежливо верни его к теме. Используй LaTeX-разметку для формул (сбалансированную, например $...$ для строчных формул и $$...$$ для выносных блоков), если приводишь математические расчеты.
Твой ответ должен быть полезным, понятным и точным.
Ты должен вернуть строго JSON-объект со следующим полем (без markdown-разметки вокруг JSON):
{
  "answer": "Подробный ответ преподавателя-ассистента на русском языке с формулами в LaTeX."
}`;
  } else {
    promptText = `Ты — строгий, но справедливый академический экзаменатор на Государственном экзамене по направлению "АПИб-22 (Прикладная информатика, искусственный интеллект)".
Твоя задача — оценить устный ответ студента на вопрос билета по сравнению с предоставленным эталонным ответом.

Входные данные:
Вопрос: ${question}
Эталонный ответ: ${etalon}
Ответ студента: ${userAnswer}

Критерии оценки:
- Оценка выставляется в процентах (score) от 0 до 100%.
- Если студент ответил на 50% и более, вердикт (verdict) должен быть "Зачтено". Иначе — "Не зачтено".
- Оценивай именно суть ответа. Студент не обязан цитировать эталон слово в слово, но ключевые термины, формулы, концепции или логика должны быть отражены.
- Если ответ студента слишком короткий (менее 5-10 символов) или бессмысленный, поставь 0%.

Ты должен вернуть строго JSON-объект со следующими полями (и ничем больше, без markdown-разметки):
{
  "score": число от 0 до 100,
  "verdict": "Зачтено" или "Не зачтено",
  "what_is_correct": "Краткое описание того, что студент ответил правильно на русском языке (1-2 предложения).",
  "what_is_missing": "Описание того, какие важные элементы из эталона были пропущены или искажены на русском языке (1-2 предложения).",
  "explanation": "Общий комментарий или совет от экзаменатора на русском языке (1-2 предложения)."
}`;
  }

  try {
    let resultJson = null;

    if (provider === 'aitunnel') {
      const response = await fetch('https://api.aitunnel.ru/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [
            { role: 'user', content: promptText }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AITunnel API Error: status ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const rawText = data.choices[0].message.content;
      resultJson = parseResponseText(rawText);

    } else if (provider === 'deepseek') {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'user', content: promptText }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`DeepSeek API Error: status ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const rawText = data.choices[0].message.content;
      resultJson = parseResponseText(rawText);

    } else if (provider === 'gemini') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: promptText }] }
          ],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API Error: status ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const rawText = data.candidates[0].content.parts[0].text;
      resultJson = parseResponseText(rawText);
    }

    // Return the evaluation result
    return res.status(200).json(resultJson);
  } catch (error) {
    console.error('Serverless Evaluation Error:', error);
    return res.status(500).json({ error: `Ошибка при проверке ответа ИИ: ${error.message}` });
  }
};

/**
 * Defensive parsing helper for LLM JSON output
 */
function parseResponseText(text) {
  try {
    // Strip potential markdown backticks/formatting
    let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.warn("Failed to parse LLM text output as JSON directly:", text, e);
    // Return a fallback object
    return {
      score: 0,
      verdict: 'Ошибка разбора',
      what_is_correct: 'Не удалось разобрать ответ от ИИ.',
      what_is_missing: 'Попробуйте отправить запрос еще раз.',
      explanation: `Сырой ответ ИИ: ${text.substring(0, 150)}...`,
      answer: `Не удалось разобрать ответ от ИИ. Сырой ответ: ${text.substring(0, 300)}...`
    };
  }
}

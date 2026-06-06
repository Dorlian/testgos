const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load environment variables from .env if it exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    // Ignore comments and empty lines
    if (!line.trim() || line.trim().startsWith('#')) return;
    
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      process.env[key] = val;
    }
  });
  console.log('Loaded environment variables from .env');
}

// Import the Vercel serverless handler
const checkAnswerHandler = require('./api/check-answer.js');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Route API calls
  if (pathname === '/api/check-answer' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    
    req.on('end', async () => {
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch (e) {
        req.body = {};
      }

      // Mock Express-like response helpers that Vercel injects
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      
      res.json = (data) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(data));
        return res;
      };

      try {
        await checkAnswerHandler(req, res);
      } catch (err) {
        console.error('Error handling API request:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: `Internal Server Error: ${err.message}` }));
      }
    });
    return;
  }

  // Serve static files
  if (pathname === '/') pathname = '/index.html';
  
  // Prevent directory traversal attacks
  const safePathname = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('404: Файл не найден');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'text/plain; charset=utf-8');
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Локальный сервер запущен: http://localhost:${PORT}`);
  console.log(`🔑 Для проверки ИИ создайте файл .env и добавьте:`);
  console.log(`   DEEPSEEK_API_KEY=ваш_ключ`);
  console.log(`   или`);
  console.log(`   GEMINI_API_KEY=ваш_ключ`);
  console.log(`==================================================\n`);
});

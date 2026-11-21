/**
 * RE:CREATE - Real Database & HTTP Backend Server
 * Run with: node server.js
 * No external npm packages required (Uses standard Node.js libraries).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper: Read database from disk
function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }
  return { categories: [], projects: [] };
}

// Helper: Write database to disk
function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing to database file:', err);
    return false;
  }
}

// Helper: Parse request body JSON (supports large image uploads up to 30MB)
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Limit to 30MB to prevent memory exhaustion
      if (body.length > 30 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', err => reject(err));
  });
}

// Helper: JSON response with CORS
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // ==========================================
  // REST API ROUTES (/api/...)
  // ==========================================

  // 1. GET /api/data (Full DB payload)
  if (req.method === 'GET' && pathname === '/api/data') {
    const db = readDB();
    return sendJSON(res, 200, db);
  }

  // 2. POST /api/upload (Upload image file as base64)
  if (req.method === 'POST' && pathname === '/api/upload') {
    try {
      const payload = await parseRequestBody(req);
      if (!payload.data) {
        return sendJSON(res, 400, { error: 'No image data provided' });
      }

      // Extract base64 and mime type: data:image/png;base64,xxxx
      const matches = payload.data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let ext = '.jpg';
      let buffer;

      if (matches && matches.length === 3) {
        const mime = matches[1];
        if (mime.includes('png')) ext = '.png';
        else if (mime.includes('webp')) ext = '.webp';
        else if (mime.includes('gif')) ext = '.gif';
        else if (mime.includes('svg')) ext = '.svg';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(payload.data, 'base64');
      }

      const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, buffer);

      const fileUrl = `/uploads/${filename}`;
      console.log(`[Upload] Image saved successfully: ${fileUrl} (${(buffer.length / 1024).toFixed(1)} KB)`);
      return sendJSON(res, 201, { success: true, url: fileUrl });
    } catch (err) {
      console.error('Image upload failed:', err);
      return sendJSON(res, 500, { error: 'Failed to upload image' });
    }
  }

  // 3. POST /api/projects (Create new project)
  if (req.method === 'POST' && pathname === '/api/projects') {
    try {
      const newProject = await parseRequestBody(req);
      if (!newProject.id) newProject.id = 'proj-' + Date.now();
      const db = readDB();
      db.projects.unshift(newProject);
      writeDB(db);
      console.log(`[API] Added project: ${newProject.title}`);
      return sendJSON(res, 201, { success: true, project: newProject });
    } catch (err) {
      return sendJSON(res, 400, { error: 'Invalid JSON payload' });
    }
  }

  // 4. PUT /api/projects/:id (Update project)
  if (req.method === 'PUT' && pathname.startsWith('/api/projects/')) {
    const id = decodeURIComponent(pathname.replace('/api/projects/', ''));
    try {
      const updateData = await parseRequestBody(req);
      const db = readDB();
      const idx = db.projects.findIndex(p => p.id === id);
      if (idx === -1) {
        return sendJSON(res, 404, { error: 'Project not found' });
      }
      db.projects[idx] = { ...db.projects[idx], ...updateData, id };
      writeDB(db);
      console.log(`[API] Updated project: ${id}`);
      return sendJSON(res, 200, { success: true, project: db.projects[idx] });
    } catch (err) {
      return sendJSON(res, 400, { error: 'Invalid update payload' });
    }
  }

  // 5. DELETE /api/projects/:id (Delete project)
  if (req.method === 'DELETE' && pathname.startsWith('/api/projects/')) {
    const id = decodeURIComponent(pathname.replace('/api/projects/', ''));
    const db = readDB();
    const idx = db.projects.findIndex(p => p.id === id);
    if (idx === -1) {
      return sendJSON(res, 404, { error: 'Project not found' });
    }
    const deleted = db.projects.splice(idx, 1)[0];
    writeDB(db);
    console.log(`[API] Deleted project: ${deleted.title}`);
    return sendJSON(res, 200, { success: true, deletedId: id });
  }

  // 6. POST /api/categories (Add category)
  if (req.method === 'POST' && pathname === '/api/categories') {
    try {
      const newCategory = await parseRequestBody(req);
      if (!newCategory.id) newCategory.id = 'cat-' + Date.now();
      const db = readDB();
      db.categories.push(newCategory);
      writeDB(db);
      console.log(`[API] Added category: ${newCategory.name}`);
      return sendJSON(res, 201, { success: true, category: newCategory });
    } catch (err) {
      return sendJSON(res, 400, { error: 'Invalid category payload' });
    }
  }

  // 7. PUT /api/categories/:id (Update category)
  if (req.method === 'PUT' && pathname.startsWith('/api/categories/')) {
    const id = decodeURIComponent(pathname.replace('/api/categories/', ''));
    try {
      const updateData = await parseRequestBody(req);
      const db = readDB();
      const idx = db.categories.findIndex(c => c.id === id);
      if (idx === -1) {
        return sendJSON(res, 404, { error: 'Category not found' });
      }
      db.categories[idx] = { ...db.categories[idx], ...updateData, id };
      if (updateData.name) {
        db.projects.forEach(p => {
          if (p.category === id) p.categoryName = updateData.name;
        });
      }
      writeDB(db);
      console.log(`[API] Updated category: ${id}`);
      return sendJSON(res, 200, { success: true, category: db.categories[idx] });
    } catch (err) {
      return sendJSON(res, 400, { error: 'Invalid category update payload' });
    }
  }

  // 8. DELETE /api/categories/:id (Delete category)
  if (req.method === 'DELETE' && pathname.startsWith('/api/categories/')) {
    const id = decodeURIComponent(pathname.replace('/api/categories/', ''));
    const db = readDB();
    const idx = db.categories.findIndex(c => c.id === id);
    if (idx === -1) {
      return sendJSON(res, 404, { error: 'Category not found' });
    }
    db.categories.splice(idx, 1);
    writeDB(db);
    console.log(`[API] Deleted category: ${id}`);
    return sendJSON(res, 200, { success: true, deletedId: id });
  }

  // 9. POST /api/reset (Reset database to defaults)
  if (req.method === 'POST' && pathname === '/api/reset') {
    try {
      const payload = await parseRequestBody(req);
      if (payload.projects && payload.categories) {
        writeDB(payload);
      }
      return sendJSON(res, 200, { success: true, message: 'Database reset successfully' });
    } catch (err) {
      return sendJSON(res, 400, { error: 'Reset failed' });
    }
  }

  // ==========================================
  // STATIC ASSETS SERVING
  // ==========================================
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(__dirname, pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found - الملف غير موجود');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`500 Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🚀 سيرفر RE:CREATE وقاعدة البيانات الحية يعمل الآن!`);
  console.log(`  🌐 الموقع الرئيسي:  http://localhost:${PORT}`);
  console.log(`  🔒 لوحة الأدمن:     http://localhost:${PORT}/admin.html`);
  console.log(`  📁 ملف الداتابيز:   database.json`);
  console.log(`  🖼️ مجلد الصور:      uploads/`);
  console.log(`======================================================\n`);
});

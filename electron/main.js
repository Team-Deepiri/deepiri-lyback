/**
 * Deepiri Studio - Electron launcher
 *
 * Pops up the wallpaper studio as a native desktop window. To keep the studio's
 * functionality byte-for-byte identical to running it in a browser (including the
 * runtime that fetches its own source for HTML export), we serve the repo over a
 * tiny local HTTP server on an ephemeral port and load that URL — rather than
 * loading studio.html over file://, where same-origin XHR is restricted.
 */
const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STUDIO_PATH = '/tools/wallpaper-studio/studio.html';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      // Strip query string and decode, then resolve safely under ROOT.
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const safePath = path
        .normalize(urlPath)
        .replace(/^(\.\.[/\\])+/, '');
      let filePath = path.join(ROOT, safePath);

      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.stat(filePath, (err, stats) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        if (stats.isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }
        fs.readFile(filePath, (readErr, data) => {
          if (readErr) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          const ext = path.extname(filePath).toLowerCase();
          res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
          res.end(data);
        });
      });
    });

    // Port 0 => OS assigns a free ephemeral port.
    server.listen(0, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

async function createWindow() {
  const server = await createServer();
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}${STUDIO_PATH}`;

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#07070d',
    title: 'Deepiri Studio',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(url);

  win.on('closed', () => {
    server.close();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

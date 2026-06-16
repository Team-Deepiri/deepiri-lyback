/**
 * Deepiri Lyback - Electron launcher
 *
 * Pops up the wallpaper studio as a native desktop window. To keep the studio's
 * functionality byte-for-byte identical to running it in a browser (including the
 * runtime that fetches its own source for HTML export), we serve the repo over a
 * tiny local HTTP server on an ephemeral port and load that URL — rather than
 * loading studio.html over file://, where same-origin XHR is restricted.
 */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const STUDIO_PATH = '/tools/wallpaper-studio/studio.html';
const VIEWER_PATH = '/tools/wallpaper-studio/viewer.html';
const DESKTOP_DIR = path.join(os.homedir(), 'Desktop');

// When the app is opened with a .lyv (double-click / file association / CLI arg),
// we route to the viewer and hand it the file. This holds the path until the
// renderer asks for it via the bridge.
let pendingLyvPath = null;

// Pull the first existing .lyv path out of a process argv array.
function lyvFromArgv(argv) {
  for (const a of argv) {
    if (typeof a === 'string' && a.toLowerCase().endsWith('.lyv')) {
      try { if (fs.existsSync(a)) return a; } catch (_e) { /* ignore */ }
    }
  }
  return null;
}

// One live shell per renderer (keyed by webContents id).
const shells = new Map();

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

// --- native bridge handlers --------------------------------------------------

// List files/folders on the user's Desktop (one level, no hidden dotfiles).
ipcMain.handle('desktop:list', async () => {
  try {
    const entries = await fs.promises.readdir(DESKTOP_DIR, { withFileTypes: true });
    return entries
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => ({
        name: e.name,
        path: path.join(DESKTOP_DIR, e.name),
        isDir: e.isDirectory(),
        ext: e.isDirectory() ? '' : path.extname(e.name).toLowerCase().replace('.', ''),
      }));
  } catch (err) {
    return { error: String(err && err.message ? err.message : err) };
  }
});

// Open a Desktop file/folder with the OS default handler. Confined to the
// Desktop dir so a renderer can't ask us to open arbitrary paths.
ipcMain.handle('shell:open', async (_e, target) => {
  try {
    const resolved = path.resolve(String(target));
    if (resolved !== DESKTOP_DIR && !resolved.startsWith(DESKTOP_DIR + path.sep)) {
      return 'Refused: path is outside the Desktop folder';
    }
    return await shell.openPath(resolved);
  } catch (err) {
    return String(err && err.message ? err.message : err);
  }
});

function killShell(wcId) {
  const child = shells.get(wcId);
  if (child) {
    try { child.kill(); } catch (_e) { /* already gone */ }
    shells.delete(wcId);
  }
}

// Start (or restart) a persistent shell bound to the calling window.
ipcMain.handle('term:start', (e) => {
  const wc = e.sender;
  killShell(wc.id);

  const shellPath = process.env.SHELL || (process.platform === 'win32' ? 'cmd.exe' : '/bin/bash');
  const child = spawn(shellPath, [], {
    cwd: os.homedir(),
    env: { ...process.env, TERM: 'dumb' },
  });
  shells.set(wc.id, child);

  const send = (chunk) => {
    if (!wc.isDestroyed()) wc.send('term:data', chunk.toString());
  };
  child.stdout.on('data', send);
  child.stderr.on('data', send);
  child.on('exit', (code) => {
    if (!wc.isDestroyed()) wc.send('term:exit', code);
    shells.delete(wc.id);
  });

  return { cwd: os.homedir(), shell: shellPath };
});

ipcMain.on('term:input', (e, data) => {
  const child = shells.get(e.sender.id);
  if (child && child.stdin.writable) child.stdin.write(data);
});

ipcMain.on('term:kill', (e) => killShell(e.sender.id));

// Hand the launched .lyv (if any) to the viewer as base64, then clear it.
ipcMain.handle('lyv:launchFile', async () => {
  if (!pendingLyvPath) return null;
  const target = pendingLyvPath;
  pendingLyvPath = null;
  try {
    const data = await fs.promises.readFile(target);
    return { name: path.basename(target), data: data.toString('base64') };
  } catch (err) {
    return { error: String(err && err.message ? err.message : err) };
  }
});

async function createWindow(route) {
  const server = await createServer();
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}${route || STUDIO_PATH}`;

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#07070d',
    title: 'Deepiri Lyback',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(url);

  win.on('closed', () => {
    killShell(win.webContents.id);
    server.close();
  });
}

// Single instance: a second launch (e.g. double-clicking another .lyv) forwards
// its file to the already-running app instead of starting a duplicate.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const file = lyvFromArgv(argv);
    if (file) {
      pendingLyvPath = file;
      createWindow(VIEWER_PATH);
    } else {
      const wins = BrowserWindow.getAllWindows();
      if (wins[0]) { wins[0].focus(); }
    }
  });

  // macOS delivers file-opens via this event (often before the app is ready).
  app.on('open-file', (e, filePath) => {
    e.preventDefault();
    pendingLyvPath = filePath;
    if (app.isReady()) createWindow(VIEWER_PATH);
  });

  app.whenReady().then(() => {
    const launchFile = lyvFromArgv(process.argv);
    if (launchFile) pendingLyvPath = launchFile;
    // open-file may have already stashed a path on macOS.
    createWindow(pendingLyvPath ? VIEWER_PATH : STUDIO_PATH);
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(pendingLyvPath ? VIEWER_PATH : STUDIO_PATH);
    }
  });
}

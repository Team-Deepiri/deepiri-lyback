/**
 * WSL-aware paths for native integration.
 *
 * On WSL, os.homedir() is the Linux home — not where Windows puts the Desktop.
 * We resolve the Windows user profile via cmd.exe and mount paths under /mnt/c/...
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, execFileSync } = require('child_process');

function isWSL() {
  if (process.platform !== 'linux') return false;
  if (process.env.WSL_DISTRO_NAME || process.env.WSLENV) return true;
  try {
    return /microsoft|wsl/i.test(fs.readFileSync('/proc/version', 'utf8'));
  } catch (_e) {
    return false;
  }
}

function windowsToWslPath(winPath) {
  const normalized = String(winPath).trim().replace(/\//g, '\\');
  const match = normalized.match(/^([A-Za-z]):\\(.*)$/);
  if (!match) return null;
  return '/mnt/' + match[1].toLowerCase() + '/' + match[2].replace(/\\/g, '/');
}

function wslToWindowsPath(wslPath) {
  const match = String(wslPath).match(/^\/mnt\/([a-z])\/(.*)$/i);
  if (!match) return wslPath;
  return match[1].toUpperCase() + ':\\' + match[2].replace(/\//g, '\\');
}

const UNSAFE_WIN_CHARS = /["&|<>^%;\r\n]/;

// Reject cmd metacharacters so a path cannot break out of execFile argv.
function isSafeWindowsPath(winPath) {
  if (typeof winPath !== 'string' || !winPath) return false;
  if (winPath.length < 3) return false;
  if (!/[A-Za-z]/.test(winPath[0]) || winPath[1] !== ':' || winPath[2] !== '\\') return false;
  return !UNSAFE_WIN_CHARS.test(winPath);
}

function isSafeWslMountPath(wslPath) {
  const s = String(wslPath);
  const m = s.match(/^\/mnt\/([a-z])\/(.*)$/i);
  if (!m) return false;
  const unsafe = /[&|<>^%;\0]/;
  const tail = m[2];
  if (unsafe.test(tail)) return false;
  for (const seg of tail.split('/')) {
    if (unsafe.test(seg)) return false;
  }
  return true;
}

function readWindowsUserProfile() {
  const raw = execFileSync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    "[Environment]::GetFolderPath('UserProfile')",
  ], {
    encoding: 'utf8',
    timeout: 5000,
  });
  return raw.replace(/\r/g, '').trim();
}

function resolveDesktopDir() {
  if (isWSL()) {
    try {
      const profile = readWindowsUserProfile();
      const wslProfile = windowsToWslPath(profile);
      if (wslProfile) {
        const desktop = path.join(wslProfile, 'Desktop');
        if (fs.existsSync(desktop)) return desktop;
      }
    } catch (_e) {
      /* fall through to Linux Desktop */
    }
  }
  return path.join(os.homedir(), 'Desktop');
}

let cachedDesktopDir = null;

function getDesktopDir() {
  if (!cachedDesktopDir) cachedDesktopDir = resolveDesktopDir();
  return cachedDesktopDir;
}

function isPathInsideDir(target, dir) {
  const resolved = path.resolve(String(target));
  const root = path.resolve(dir);
  return resolved === root || resolved.startsWith(root + path.sep);
}

function openDesktopPath(target) {
  const desktopDir = getDesktopDir();
  const resolved = path.resolve(String(target));
  if (!isPathInsideDir(resolved, desktopDir)) {
    return Promise.resolve('Refused: path is outside the Desktop folder');
  }

  if (isWSL() && resolved.startsWith('/mnt/')) {
    if (!isSafeWslMountPath(resolved)) {
      return Promise.resolve('Refused: invalid path');
    }
    const winPath = wslToWindowsPath(resolved);
    if (!isSafeWindowsPath(winPath)) {
      return Promise.resolve('Refused: invalid path');
    }
    return new Promise((resolve) => {
      execFile('explorer.exe', [winPath], { timeout: 10000 }, (err) => {
        resolve(err ? String(err.message || err) : '');
      });
    });
  }

  const { shell } = require('electron');
  return shell.openPath(resolved);
}

function getTerminalCwd() {
  return os.homedir();
}

module.exports = {
  isWSL,
  windowsToWslPath,
  wslToWindowsPath,
  isSafeWindowsPath,
  isSafeWslMountPath,
  getDesktopDir,
  isPathInsideDir,
  openDesktopPath,
  getTerminalCwd,
};

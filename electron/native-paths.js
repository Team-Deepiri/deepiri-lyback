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

function readWindowsUserProfile() {
  const raw = execFileSync('cmd.exe', ['/c', 'echo', '%USERPROFILE%'], {
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
    const winPath = wslToWindowsPath(resolved);
    return new Promise((resolve) => {
      execFile('cmd.exe', ['/c', 'start', '', winPath], { timeout: 10000 }, (err) => {
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
  getDesktopDir,
  isPathInsideDir,
  openDesktopPath,
  getTerminalCwd,
};

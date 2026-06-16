/**
 * Preload bridge for Deepiri Lyback.
 *
 * Runs with Node access but in an isolated context, and exposes a small, explicit
 * API to the studio renderer via contextBridge — never the raw ipcRenderer or fs.
 * Everything the world needs to touch the real machine (Desktop files, opening a
 * file, the terminal shell) goes through here.
 */
const { contextBridge, ipcRenderer } = require('electron');

const dataListeners = new Set();
const exitListeners = new Set();

ipcRenderer.on('term:data', (_e, chunk) => {
  for (const cb of dataListeners) cb(chunk);
});
ipcRenderer.on('term:exit', (_e, code) => {
  for (const cb of exitListeners) cb(code);
});

contextBridge.exposeInMainWorld('deepiriNative', {
  isElectron: true,

  // Files on the user's Desktop, for spawning file portals.
  listDesktop: () => ipcRenderer.invoke('desktop:list'),

  // Open a file/folder with the OS default handler. Returns '' on success or
  // an error string.
  openPath: (p) => ipcRenderer.invoke('shell:open', p),

  // The .lyv the app was launched/opened with, as { name, data(base64) }, or null.
  getLaunchFile: () => ipcRenderer.invoke('lyv:launchFile'),

  // Terminal: a persistent shell scoped to the user's session.
  terminal: {
    start: () => ipcRenderer.invoke('term:start'),
    input: (data) => ipcRenderer.send('term:input', data),
    kill: () => ipcRenderer.send('term:kill'),
    onData: (cb) => {
      dataListeners.add(cb);
      return () => dataListeners.delete(cb);
    },
    onExit: (cb) => {
      exitListeners.add(cb);
      return () => exitListeners.delete(cb);
    },
  },
});

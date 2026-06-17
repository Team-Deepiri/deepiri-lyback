const {
  windowsToWslPath, wslToWindowsPath, isPathInsideDir,
  isSafeWindowsPath, isSafeWslMountPath,
} = require('./native-paths');

describe('native-paths', () => {
  it('converts Windows paths to WSL mount paths', () => {
    expect(windowsToWslPath('C:\\Users\\alice\\Desktop')).toBe('/mnt/c/Users/alice/Desktop');
    expect(windowsToWslPath('D:/data/file.txt')).toBe('/mnt/d/data/file.txt');
  });

  it('converts WSL mount paths back to Windows paths', () => {
    expect(wslToWindowsPath('/mnt/c/Users/alice/Desktop')).toBe('C:\\Users\\alice\\Desktop');
    expect(wslToWindowsPath('/mnt/d/data/file.txt')).toBe('D:\\data\\file.txt');
  });

  it('checks paths stay inside a directory', () => {
    const root = '/mnt/c/Users/alice/Desktop';
    expect(isPathInsideDir('/mnt/c/Users/alice/Desktop/note.txt', root)).toBe(true);
    expect(isPathInsideDir('/mnt/c/Users/alice/Documents/x', root)).toBe(false);
  });

  it('rejects Windows paths with shell metacharacters', () => {
    expect(isSafeWindowsPath('C:\\Users\\alice\\Desktop\\note.txt')).toBe(true);
    expect(isSafeWindowsPath('C:\\Users\\alice\\Desktop\\evil & calc.exe')).toBe(false);
    expect(isSafeWindowsPath('C:\\Users\\alice\\Desktop\\evil|calc')).toBe(false);
  });

  it('rejects malformed WSL mount paths', () => {
    expect(isSafeWslMountPath('/mnt/c/Users/alice/Desktop/note.txt')).toBe(true);
    expect(isSafeWslMountPath('/mnt/c/Users/alice/Desktop/evil & calc')).toBe(false);
    expect(isSafeWslMountPath('/tmp/outside')).toBe(false);
  });

  it('validates long Windows paths without regex backtracking', () => {
    const long = 'C:\\Users\\alice\\' + 'folder\\'.repeat(200) + 'file.txt';
    expect(isSafeWindowsPath(long)).toBe(true);
    expect(isSafeWindowsPath('A:\\' + '!\\'.repeat(200))).toBe(true);
    expect(isSafeWindowsPath('C:\\evil & calc')).toBe(false);
  });
});

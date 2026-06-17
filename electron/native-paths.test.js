const { windowsToWslPath, wslToWindowsPath, isPathInsideDir } = require('./native-paths');

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
});

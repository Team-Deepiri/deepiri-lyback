const Utils = require('./utils.js');

describe('Utils', () => {
  describe('hexToRgb', () => {
    it('converts valid hex to RGB', () => {
      expect(Utils.hexToRgb('#ff6b6b')).toEqual({ r: 255, g: 107, b: 107 });
      expect(Utils.hexToRgb('#4ecdc4')).toEqual({ r: 78, g: 205, b: 196 });
    });

    it('handles hex without hash prefix', () => {
      expect(Utils.hexToRgb('ff6b6b')).toEqual({ r: 255, g: 107, b: 107 });
    });

    it('returns null for invalid hex', () => {
      expect(Utils.hexToRgb('invalid')).toBeNull();
    });
  });

  describe('rgbToHex', () => {
    it('converts RGB to hex string', () => {
      expect(Utils.rgbToHex(255, 107, 107)).toBe('#ff6b6b');
      expect(Utils.rgbToHex(78, 205, 196)).toBe('#4ecdc4');
    });

    it('pads single digit hex values', () => {
      expect(Utils.rgbToHex(0, 0, 0)).toBe('#000000');
    });
  });

  describe('randomInRange', () => {
    it('returns a number within range', () => {
      for (let i = 0; i < 100; i++) {
        const val = Utils.randomInRange(5, 10);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThan(10);
      }
    });
  });

  describe('clamp', () => {
    it('clamps values below min', () => {
      expect(Utils.clamp(-5, 0, 10)).toBe(0);
    });

    it('clamps values above max', () => {
      expect(Utils.clamp(15, 0, 10)).toBe(10);
    });

    it('returns value when within range', () => {
      expect(Utils.clamp(5, 0, 10)).toBe(5);
    });
  });

  describe('distance', () => {
    it('calculates euclidean distance', () => {
      expect(Utils.distance(0, 0, 3, 4)).toBe(5);
    });

    it('returns 0 for same point', () => {
      expect(Utils.distance(5, 5, 5, 5)).toBe(0);
    });
  });
});

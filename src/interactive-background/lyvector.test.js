const zlib = require('zlib');
const Lyvector = require('./lyvector.js');

// Build a guaranteed-valid 2x2 RGBA PNG and a fake canvas that serves it,
// since canvas.toDataURL isn't available in the test environment.
function u32(v) {
  return Uint8Array.from([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]);
}
const crc32 = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return (b) => {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
})();
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), Buffer.from(data)]);
  return Buffer.concat([u32(body.length - 4), body, u32(crc32(body))]);
}
function makePng(w, h) {
  const ihdr = Buffer.concat([u32(w), u32(h), Buffer.from([8, 6, 0, 0, 0])]);
  const raw = [];
  for (let y = 0; y < h; y++) {
    raw.push(0);
    for (let x = 0; x < w; x++) raw.push(80, 200, 190, 255);
  }
  const idat = zlib.deflateSync(Buffer.from(raw));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))
  ]);
}
function fakeCanvas() {
  const png = makePng(2, 2);
  return { toDataURL: () => 'data:image/png;base64,' + png.toString('base64') };
}

function readU32BE(b, o) {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}
function walkTypes(bytes) {
  const seen = [];
  let off = 8;
  while (off + 12 <= bytes.length) {
    const len = readU32BE(bytes, off);
    seen.push(String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]));
    off += 12 + len;
  }
  return seen;
}

const CONFIG = { mode: 'world', worldWidth: 5000, biome: 'forest', weather: 'rain', timeOfDay: 0.42 };

async function bytesOf(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

describe('Lyvector format', () => {
  it('produces a byte-for-byte valid PNG (polyglot poster)', async () => {
    const bytes = await bytesOf(await Lyvector.encode(CONFIG, fakeCanvas()));
    expect(Lyvector.isPng(bytes)).toBe(true);
  });

  it('inserts the lyVr payload as a clean chunk before IEND', async () => {
    const bytes = await bytesOf(await Lyvector.encode(CONFIG, fakeCanvas()));
    expect(walkTypes(bytes)).toEqual(['IHDR', 'IDAT', 'lyVr', 'IEND']);
  });

  it('writes a valid CRC32 on the lyVr chunk', async () => {
    const bytes = await bytesOf(await Lyvector.encode(CONFIG, fakeCanvas()));
    let off = 8;
    let ok = false;
    while (off + 12 <= bytes.length) {
      const len = readU32BE(bytes, off);
      const type = String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]);
      if (type === 'lyVr') {
        ok = readU32BE(bytes, off + 8 + len) === crc32(bytes.subarray(off + 4, off + 8 + len));
      }
      off += 12 + len;
    }
    expect(ok).toBe(true);
  });

  it('round-trips the world description through the polyglot', async () => {
    const bytes = await bytesOf(await Lyvector.encode(CONFIG, fakeCanvas()));
    const decoded = Lyvector.decode(bytes);
    expect(decoded.scene.worldWidth).toBe(5000);
    expect(decoded.scene.biome).toBe('forest');
    expect(decoded.scene.weather).toBe('rain');
  });

  it('supports a pure (non-polyglot) .lyv', async () => {
    const bytes = await bytesOf(await Lyvector.encode(CONFIG, null));
    expect(Lyvector.isPng(bytes)).toBe(false);
    expect(Lyvector.decode(bytes).scene.worldWidth).toBe(5000);
  });

  it('optionally embeds a self-contained engine', async () => {
    const bytes = await bytesOf(await Lyvector.encode(CONFIG, fakeCanvas(), { embedEngine: true, engineCode: '/*E*/' }));
    expect(Lyvector.decode(bytes).engine).toBe('/*E*/');
  });

  it('returns null for bytes with no Lyvector payload', () => {
    expect(Lyvector.decode(makePng(2, 2))).toBe(null);
  });
});

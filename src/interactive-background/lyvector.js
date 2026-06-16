/**
 * Lyvector (.lyv) — Deepiri's interactive world file format.
 *
 * A .lyv file does not store pixels like PNG/JPG; it stores a *world*: a compact
 * description (seed, palette, entities, rules) that the engine renders live at
 * any resolution and reacts to input. PNG stores a frame, SVG stores a shape,
 * .lyv stores a world.
 *
 * To be shareable everywhere it is a POLYGLOT: the bytes are a byte-for-byte
 * valid PNG (a "poster" frame) carrying the world inside a spec-legal ancillary
 * private chunk ("lyVr"). Dumb image viewers/browsers/chat apps see a normal
 * picture (they ignore unknown ancillary chunks by the PNG spec); the Deepiri
 * studio / viewer reads the chunk and the picture comes alive.
 *
 *   PNG signature ... IHDR ... IDAT(poster) ... [lyVr: LYV payload] ... IEND
 *
 * The lyVr payload itself:
 *   "LYV1"      4 bytes  magic
 *   version     1 byte
 *   flags       1 byte   bit0 = engine embedded
 *   sceneLen    4 bytes  big-endian
 *   scene       UTF-8 JSON (the world description — the "vector")
 *   [engineLen  4 bytes + engine UTF-8]   (optional, when flags bit0 set)
 */
const Lyvector = (() => {
  const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  const CHUNK_TYPE = 'lyVr'; // ancillary(l) private(y) reserved-ok(V) safe-to-copy(r)
  const MAGIC = 'LYV1';
  const VERSION = 1;
  const FLAG_ENGINE = 1;

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function readU32BE(b, o) {
    return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  }

  function writeU32BE(b, o, v) {
    b[o] = (v >>> 24) & 0xFF;
    b[o + 1] = (v >>> 16) & 0xFF;
    b[o + 2] = (v >>> 8) & 0xFF;
    b[o + 3] = v & 0xFF;
  }

  function strBytes(s) {
    return new TextEncoder().encode(s);
  }

  function bytesStr(b) {
    return new TextDecoder().decode(b);
  }

  function isPng(bytes) {
    if (!bytes || bytes.length < 8) return false;
    for (let i = 0; i < 8; i++) {
      if (bytes[i] !== PNG_SIG[i]) return false;
    }
    return true;
  }

  // base64 (data URL) -> Uint8Array
  function b64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // ---- the world description (the "vector") --------------------------------
  // Distil a studio config into a minimal, portable scene block.
  function buildScene(config) {
    const c = config || {};
    return {
      f: 'lyvector',
      mode: c.mode || 'world',
      worldWidth: c.worldWidth,
      platformCount: c.platformCount,
      portalCount: c.portalCount,
      particleCount: c.particleCount,
      creatureCount: c.creatureCount,
      chestCount: c.chestCount,
      crystalCount: c.crystalCount,
      biome: c.biome,
      weather: c.weather,
      timeOfDay: c.timeOfDay,
      skyTop: c.skyTop,
      skyBottom: c.skyBottom,
      groundTop: c.groundTop,
      groundBottom: c.groundBottom,
      playerColor: c.playerColor,
      colors: c.colors,
      bgColor: c.bgColor,
      speed: c.speed,
      particleSize: c.particleSize,
      gridEffect: c.gridEffect,
      glow: c.glow
    };
  }

  // Build the raw LYV payload (the bytes that live inside the lyVr chunk, or
  // stand alone as a "pure" .lyv).
  function buildPayload(config, engineCode) {
    const sceneBytes = strBytes(JSON.stringify(buildScene(config)));
    const hasEngine = !!engineCode;
    const engineBytes = hasEngine ? strBytes(engineCode) : new Uint8Array(0);
    let size = 4 + 1 + 1 + 4 + sceneBytes.length;
    if (hasEngine) size += 4 + engineBytes.length;

    const out = new Uint8Array(size);
    let o = 0;
    out.set(strBytes(MAGIC), o); o += 4;
    out[o++] = VERSION;
    out[o++] = hasEngine ? FLAG_ENGINE : 0;
    writeU32BE(out, o, sceneBytes.length); o += 4;
    out.set(sceneBytes, o); o += sceneBytes.length;
    if (hasEngine) {
      writeU32BE(out, o, engineBytes.length); o += 4;
      out.set(engineBytes, o); o += engineBytes.length;
    }
    return out;
  }

  function parsePayload(payload) {
    if (bytesStr(payload.subarray(0, 4)) !== MAGIC) return null;
    const version = payload[4];
    const flags = payload[5];
    let o = 6;
    const sceneLen = readU32BE(payload, o); o += 4;
    const scene = JSON.parse(bytesStr(payload.subarray(o, o + sceneLen)));
    o += sceneLen;
    let engine = null;
    if (flags & FLAG_ENGINE) {
      const engineLen = readU32BE(payload, o); o += 4;
      engine = bytesStr(payload.subarray(o, o + engineLen));
    }
    return { version, scene, engine };
  }

  // ---- PNG chunk surgery ---------------------------------------------------
  function makeChunk(type, data) {
    const out = new Uint8Array(12 + data.length);
    writeU32BE(out, 0, data.length);
    out.set(strBytes(type), 4);
    out.set(data, 8);
    // CRC covers type + data.
    out.set(new Uint8Array(4), 8 + data.length);
    writeU32BE(out, 8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  }

  function findChunk(bytes, type) {
    let off = 8;
    while (off + 12 <= bytes.length) {
      const len = readU32BE(bytes, off);
      const t = bytesStr(bytes.subarray(off + 4, off + 8));
      if (t === type) return { start: off, dataStart: off + 8, len };
      off += 12 + len;
    }
    return null;
  }

  function insertBeforeIEND(pngBytes, chunk) {
    const iend = findChunk(pngBytes, 'IEND');
    const at = iend ? iend.start : pngBytes.length;
    const out = new Uint8Array(pngBytes.length + chunk.length);
    out.set(pngBytes.subarray(0, at), 0);
    out.set(chunk, at);
    out.set(pngBytes.subarray(at), at + chunk.length);
    return out;
  }

  // ---- public API ----------------------------------------------------------

  /**
   * Encode a .lyv. With a poster canvas, produces a polyglot (valid PNG that
   * displays as an image everywhere). Without one, produces a "pure" .lyv.
   * opts.embedEngine + engineCode bakes a self-contained runtime in.
   */
  function encode(config, posterCanvas, opts) {
    const options = opts || {};
    const engineCode = options.embedEngine ? options.engineCode : null;
    const payload = buildPayload(config, engineCode);

    if (!posterCanvas) {
      // Pure .lyv: just the payload bytes.
      return new Blob([payload], { type: 'application/octet-stream' });
    }

    const posterBytes = b64ToBytes(posterCanvas.toDataURL('image/png').split(',')[1]);
    const chunk = makeChunk(CHUNK_TYPE, payload);
    const result = insertBeforeIEND(posterBytes, chunk);
    // image/png MIME so content-sniffing apps treat it as the picture it is.
    return new Blob([result], { type: 'image/png' });
  }

  /**
   * Decode a .lyv (polyglot PNG or pure). Returns { version, scene, engine } or
   * null if no Lyvector payload is present.
   */
  function decode(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (isPng(b)) {
      const chunk = findChunk(b, CHUNK_TYPE);
      if (chunk) return parsePayload(b.subarray(chunk.dataStart, chunk.dataStart + chunk.len));
      // Tolerate legacy "appended after IEND" payloads.
      const idx = indexOfMagic(b);
      if (idx >= 0) return parsePayload(b.subarray(idx));
      return null;
    }
    if (bytesStr(b.subarray(0, 4)) === MAGIC) return parsePayload(b);
    return null;
  }

  function indexOfMagic(b) {
    const m = strBytes(MAGIC);
    for (let i = 0; i <= b.length - 4; i++) {
      if (b[i] === m[0] && b[i + 1] === m[1] && b[i + 2] === m[2] && b[i + 3] === m[3]) return i;
    }
    return -1;
  }

  return {
    encode,
    decode,
    buildScene,
    buildPayload,
    parsePayload,
    isPng,
    CHUNK_TYPE,
    MAGIC,
    VERSION
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Lyvector;
}

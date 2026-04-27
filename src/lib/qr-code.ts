const DATA_CODEWORDS_L = [0, 19, 34, 55, 80, 108] as const;
const ECC_CODEWORDS_L = [0, 7, 10, 15, 20, 26] as const;
const ALIGNMENT_CENTERS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
};

type Matrix = boolean[][];

export function createQrSvg(data: string, opts: { scale?: number; border?: number } = {}): string {
  const qr = encodeQr(data);
  const scale = opts.scale ?? 6;
  const border = opts.border ?? 4;
  const outer = (qr.size + border * 2) * scale;
  const rects: string[] = [];

  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (!qr.modules[y][x]) continue;
      rects.push(
        `<rect x="${(x + border) * scale}" y="${(y + border) * scale}" width="${scale}" height="${scale}"/>`,
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outer} ${outer}" width="${outer}" height="${outer}" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${rects.join("")}</g></svg>`;
}

export function createQrDataUri(data: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(createQrSvg(data))}`;
}

export function encodeQr(data: string): { version: number; size: number; modules: Matrix } {
  const bytes = Array.from(new TextEncoder().encode(data));
  const version = chooseVersion(bytes.length);
  const size = version * 4 + 17;
  const dataCodewords = DATA_CODEWORDS_L[version];
  const eccCodewords = ECC_CODEWORDS_L[version];
  const codewords = buildCodewords(bytes, dataCodewords);
  const ecc = reedSolomonRemainder(codewords, eccCodewords);
  const allCodewords = [...codewords, ...ecc];

  let best: { modules: Matrix; penalty: number; mask: number } | null = null;
  for (let mask = 0; mask < 8; mask++) {
    const { modules, reserved } = createBaseMatrix(version);
    drawFormatBits(modules, reserved, mask);
    drawCodewords(modules, reserved, allCodewords, mask);
    const penalty = getPenaltyScore(modules);
    if (!best || penalty < best.penalty) best = { modules, penalty, mask };
  }

  if (!best) throw new Error("QR generation failed");
  return { version, size, modules: best.modules };
}

function chooseVersion(byteLength: number): 1 | 2 | 3 | 4 | 5 {
  for (const version of [1, 2, 3, 4, 5] as const) {
    const capacityBits = DATA_CODEWORDS_L[version] * 8;
    const neededBits = 4 + 8 + byteLength * 8;
    if (neededBits <= capacityBits) return version;
  }
  throw new Error("QR payload too long for local generator");
}

function buildCodewords(bytes: number[], dataCodewords: number): number[] {
  const bits: number[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  for (const b of bytes) appendBits(bits, b, 8);

  const capacityBits = dataCodewords * 8;
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const result: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    result.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
  }
  for (let pad = 0xec; result.length < dataCodewords; pad ^= 0xfd) {
    result.push(pad);
  }
  return result;
}

function appendBits(bits: number[], value: number, length: number): void {
  for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
}

function createBaseMatrix(version: number): { modules: Matrix; reserved: boolean[][] } {
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));

  drawFinder(modules, reserved, 3, 3);
  drawFinder(modules, reserved, size - 4, 3);
  drawFinder(modules, reserved, 3, size - 4);

  for (const cy of ALIGNMENT_CENTERS[version]) {
    for (const cx of ALIGNMENT_CENTERS[version]) {
      if ((cx === 6 && cy === 6) || (cx === 6 && cy === size - 7) || (cx === size - 7 && cy === 6)) {
        continue;
      }
      drawAlignment(modules, reserved, cx, cy);
    }
  }

  for (let i = 8; i < size - 8; i++) {
    setFunction(modules, reserved, i, 6, i % 2 === 0);
    setFunction(modules, reserved, 6, i, i % 2 === 0);
  }
  setFunction(modules, reserved, 8, size - 8, true);
  reserveFormat(reserved);
  return { modules, reserved };
}

function drawFinder(modules: Matrix, reserved: boolean[][], cx: number, cy: number): void {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (!isInside(modules.length, x, y)) continue;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      const dark = Math.max(adx, ady) === 3 || Math.max(adx, ady) <= 1;
      setFunction(modules, reserved, x, y, dark);
    }
  }
}

function drawAlignment(modules: Matrix, reserved: boolean[][], cx: number, cy: number): void {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const dark = Math.max(Math.abs(dx), Math.abs(dy)) !== 1;
      setFunction(modules, reserved, cx + dx, cy + dy, dark);
    }
  }
}

function reserveFormat(reserved: boolean[][]): void {
  const size = reserved.length;
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      reserved[8][i] = true;
      reserved[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }
}

function drawFormatBits(modules: Matrix, reserved: boolean[][], mask: number): void {
  const size = modules.length;
  const bits = getFormatBits(mask);
  for (let i = 0; i <= 5; i++) setFunction(modules, reserved, 8, i, bit(bits, i));
  setFunction(modules, reserved, 8, 7, bit(bits, 6));
  setFunction(modules, reserved, 8, 8, bit(bits, 7));
  setFunction(modules, reserved, 7, 8, bit(bits, 8));
  for (let i = 9; i < 15; i++) setFunction(modules, reserved, 14 - i, 8, bit(bits, i));

  for (let i = 0; i < 8; i++) setFunction(modules, reserved, size - 1 - i, 8, bit(bits, i));
  for (let i = 8; i < 15; i++) setFunction(modules, reserved, 8, size - 15 + i, bit(bits, i));
}

function getFormatBits(mask: number): number {
  let data = (0b01 << 3) | mask;
  let rem = data << 10;
  const generator = 0b10100110111;
  for (let i = 14; i >= 10; i--) {
    if (((rem >>> i) & 1) !== 0) rem ^= generator << (i - 10);
  }
  return ((data << 10) | rem) ^ 0b101010000010010;
}

function bit(value: number, index: number): boolean {
  return ((value >>> index) & 1) !== 0;
}

function drawCodewords(modules: Matrix, reserved: boolean[][], codewords: number[], mask: number): void {
  const bits = codewords.flatMap((cw) => {
    const arr: number[] = [];
    appendBits(arr, cw, 8);
    return arr;
  });
  const size = modules.length;
  let bitIndex = 0;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right--;
    for (let vert = 0; vert < size; vert++) {
      const y = upward ? size - 1 - vert : vert;
      for (let x = right; x >= right - 1; x--) {
        if (reserved[y][x]) continue;
        const raw = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
        modules[y][x] = raw !== getMask(mask, x, y);
        bitIndex++;
      }
    }
    upward = !upward;
  }
}

function getMask(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return false;
  }
}

function setFunction(modules: Matrix, reserved: boolean[][], x: number, y: number, dark: boolean): void {
  modules[y][x] = dark;
  reserved[y][x] = true;
}

function isInside(size: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < size && y < size;
}

function reedSolomonRemainder(data: number[], degree: number): number[] {
  const generator = reedSolomonGenerator(degree);
  const result = Array(degree).fill(0);
  for (const b of data) {
    const factor = b ^ result.shift()!;
    result.push(0);
    for (let i = 0; i < degree; i++) result[i] ^= gfMultiply(generator[i], factor);
  }
  return result;
}

function reedSolomonGenerator(degree: number): number[] {
  let result = [1];
  for (let i = 0; i < degree; i++) {
    const next = Array(result.length + 1).fill(0);
    for (let j = 0; j < result.length; j++) {
      next[j] ^= gfMultiply(result[j], gfPow(2, i));
      next[j + 1] ^= result[j];
    }
    result = next;
  }
  return result.slice(1);
}

function gfPow(x: number, power: number): number {
  let result = 1;
  for (let i = 0; i < power; i++) result = gfMultiply(result, x);
  return result;
}

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    if (((y >>> i) & 1) !== 0) z ^= x;
  }
  return z & 0xff;
}

function getPenaltyScore(modules: Matrix): number {
  const size = modules.length;
  let score = 0;

  for (let y = 0; y < size; y++) {
    let runColor = modules[y][0];
    let runLen = 1;
    for (let x = 1; x < size; x++) {
      if (modules[y][x] === runColor) runLen++;
      else {
        if (runLen >= 5) score += runLen - 2;
        runColor = modules[y][x];
        runLen = 1;
      }
    }
    if (runLen >= 5) score += runLen - 2;
  }

  for (let x = 0; x < size; x++) {
    let runColor = modules[0][x];
    let runLen = 1;
    for (let y = 1; y < size; y++) {
      if (modules[y][x] === runColor) runLen++;
      else {
        if (runLen >= 5) score += runLen - 2;
        runColor = modules[y][x];
        runLen = 1;
      }
    }
    if (runLen >= 5) score += runLen - 2;
  }

  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) {
        score += 3;
      }
    }
  }

  const dark = modules.flat().filter(Boolean).length;
  const k = Math.abs(Math.floor((dark * 20) / (size * size)) - 10);
  return score + k * 10;
}

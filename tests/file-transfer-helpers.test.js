import { describe, it, expect } from 'vitest';
import { computeTotalChunks, computeChecksum } from '../src/lib/fileTransfer.js';

describe('file transfer helpers', () => {
  it('computes total chunks including partial last chunk', () => {
    const file = new File(['a'.repeat(10)], 't.txt');
    expect(computeTotalChunks(file, 3)).toBe(4);
  });

  it('computes SHA-256 checksum', async () => {
    const file = new File(['abc'], 't.txt');
    const hash = await computeChecksum(file);
    expect(hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
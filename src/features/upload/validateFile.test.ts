import { describe, expect, it } from 'vitest'
import { hasPdfHeader } from './validateFile'

const enc = (s: string) => new TextEncoder().encode(s)

describe('hasPdfHeader', () => {
  it('accepts a normal header', () => {
    expect(hasPdfHeader(enc('%PDF-1.7 ...'))).toBe(true)
  })
  it('accepts a header preceded by a little junk', () => {
    expect(hasPdfHeader(enc('  junk %PDF-1.4'))).toBe(true)
  })
  it('rejects other files', () => {
    expect(hasPdfHeader(enc('<html></html>'))).toBe(false)
    expect(hasPdfHeader(enc('PK zip data'))).toBe(false)
    expect(hasPdfHeader(new Uint8Array())).toBe(false)
  })
  it('rejects a header buried past 1024 bytes', () => {
    expect(hasPdfHeader(enc(' '.repeat(2000) + '%PDF-1.4'))).toBe(false)
  })
})

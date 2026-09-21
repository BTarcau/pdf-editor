import { t } from '../../strings'

export const MAX_FILE_BYTES = 200 * 1024 * 1024

export class FileValidationError extends Error {}

/** Reads a File into bytes after checking size and the `%PDF-` magic number. */
export async function readPdfFile(file: File): Promise<Uint8Array> {
  if (file.size === 0) throw new FileValidationError(t.errEmpty)
  if (file.size > MAX_FILE_BYTES) {
    throw new FileValidationError(t.errTooLarge(Math.round(file.size / 1024 / 1024)))
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!hasPdfHeader(bytes)) throw new FileValidationError(t.errNotPdf)
  return bytes
}

/** The spec allows junk before the header, but only within the first 1024 bytes. */
export function hasPdfHeader(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length - 4, 1024)
  for (let i = 0; i < limit; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 && // F
      bytes[i + 4] === 0x2d // -
    ) {
      return true
    }
  }
  return false
}

export function pageWidth(index: number): number
export function makePdf(pageCount: number): Promise<Uint8Array>
export function pageWidths(bytes: Uint8Array): Promise<number[]>

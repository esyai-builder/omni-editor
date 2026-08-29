const waveformCache = new Map<string, number[]>();
const thumbnailCache = new Map<string, string>();
const imageElementCache = new Map<string, HTMLImageElement>();

export function getCachedWaveform(path: string): number[] | undefined { return waveformCache.get(path); }
export function setCachedWaveform(path: string, peaks: number[]) { waveformCache.set(path, peaks); }
export function getCachedThumbnail(id: string): string | undefined { return thumbnailCache.get(id); }
export function setCachedThumbnail(id: string, dataUrl: string) { thumbnailCache.set(id, dataUrl); }
export function getImageElement(path: string): HTMLImageElement | undefined { return imageElementCache.get(path); }
export function setImageElement(path: string, img: HTMLImageElement) { imageElementCache.set(path, img); }

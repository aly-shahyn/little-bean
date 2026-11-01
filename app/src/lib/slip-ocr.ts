/**
 * Reads a bank slip screenshot in the browser with tesseract.js. The image never leaves the
 * customer's device; only the OCR engine files are downloaded (once, then cached) from jsDelivr.
 * Client only.
 */
import type { Worker } from "tesseract.js";

import { readSlip, type SlipResult } from "./slip";

// Pinned versions; keep in step with "tesseract.js" in package.json.
const OCR = {
  worker: "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js",
  core: "https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0",
  lang: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int",
};

let workerP: Promise<Worker> | null = null;

export function preloadSlipReader(): Promise<Worker> {
  if (!workerP) {
    workerP = (async () => {
      const T = await import("tesseract.js");
      return T.createWorker("eng", T.OEM.LSTM_ONLY, { workerPath: OCR.worker, corePath: OCR.core, langPath: OCR.lang, gzip: true });
    })();
    workerP.catch(() => { workerP = null; });
  }
  return workerP;
}

/** Scales the screenshot and turns it into black text on white, so light green/grey text reads well. */
async function prepare(file: File, threshold: boolean): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1000 / bmp.width);
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  const dark = sum / (d.length / 4) < 110; // dark-mode screenshot: flip it
  for (let i = 0; i < d.length; i += 4) {
    let v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (dark) v = 255 - v;
    if (threshold) v = v < 215 ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export async function readSlipImage(file: File): Promise<{ slip: SlipResult; text: string }> {
  const worker = await preloadSlipReader();
  const a = (await worker.recognize(await prepare(file, true))).data.text;
  let slip = readSlip(a);
  if (slip.bank && slip.amount !== null) return { slip, text: a };
  // Second try without the black/white step (helps with photos of a screen).
  const b = (await worker.recognize(await prepare(file, false))).data.text;
  const both = readSlip(`${a}\n${b}`);
  slip = both.bank ? both : readSlip(b);
  return { slip, text: `${a}\n${b}` };
}

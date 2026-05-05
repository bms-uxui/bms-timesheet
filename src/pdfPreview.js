import { getPdfjs } from './parser.js';

export async function renderPDFPreview(arrayBuffer, container) {
  const pdfjs = await getPdfjs();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  container.innerHTML = '';
  const dpr = window.devicePixelRatio || 1;
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const baseViewport = page.getViewport({ scale: 1 });
    const targetW = Math.max(280, container.clientWidth - 16);
    const scale = targetW / baseViewport.width;
    const viewport = page.getViewport({ scale: scale * dpr });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.className = 'pdf-page';
    canvas.style.width = `${baseViewport.width * scale}px`;
    canvas.style.height = `${baseViewport.height * scale}px`;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
  }
}

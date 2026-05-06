import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';

// pdf.js doesn't run natively in React Native (needs DOM + canvas). We host
// it inside a hidden WebView, send the PDF as base64, and pull back parsed
// row data via postMessage. Same parsing logic as the web build, including
// the BMS custom-font ASCII shift.
const HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body>
<script type="module">
import * as pdfjs from 'https://unpkg.com/pdfjs-dist@4.7.76/legacy/build/pdf.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.7.76/legacy/build/pdf.worker.min.mjs';

function decodeAscii(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out += (c >= 0x01 && c <= 0x5F) ? String.fromCharCode(c + 31) : s[i];
  }
  return out;
}

const DATE_RE = /(\\d{2})\\/(\\d{2})\\/(\\d{4})/;
const TIME_RE_G = /(\\d{2}):(\\d{2}):(\\d{2})/g;

async function extractRows(pdf) {
  const out = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .map(i => ({ str: i.str || '', x: i.transform[4], y: i.transform[5] }))
      .filter(i => i.str.trim());
    const buckets = new Map();
    for (const i of items) {
      const k = Math.round(i.y);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(i);
    }
    const ordered = [...buckets.keys()].sort((a,b) => b - a);
    const merged = [];
    for (const k of ordered) {
      const last = merged[merged.length - 1];
      if (last && Math.abs(last.y - k) <= 2) last.items.push(...buckets.get(k));
      else merged.push({ y: k, items: buckets.get(k) });
    }
    for (const row of merged) {
      row.items.sort((a,b) => a.x - b.x);
      const text = row.items.map(i => decodeAscii(i.str)).join(' ');
      const dm = text.match(DATE_RE);
      if (!dm) continue;
      const year = +dm[3] - 543;
      const date = new Date(year, +dm[2] - 1, +dm[1]).toISOString();
      const times = [...text.matchAll(TIME_RE_G)].map(m => m[0]);
      const statusText = text
        .replace(new RegExp(DATE_RE.source, 'g'), '')
        .replace(TIME_RE_G, '')
        .replace(/[-−]/g, ' ')
        .replace(/\\s+/g, ' ')
        .trim();
      out.push({ date, dateKey: dm[0], checkIn: times[0]||null, checkOut: times[1]||null, statusText });
    }
  }
  out.sort((a,b) => new Date(a.date) - new Date(b.date));
  return out;
}

window.parseBase64 = async function(b64) {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const rows = await extractRows(pdf);
    window.ReactNativeWebView.postMessage(JSON.stringify({ ok: true, rows }));
  } catch (e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ ok: false, error: String(e && e.message || e) }));
  }
};

window.ReactNativeWebView.postMessage(JSON.stringify({ ready: true }));
</script>
</body>
</html>`;

export const PdfParserWebView = forwardRef(function PdfParserWebView(_props, ref) {
  const webRef = useRef(null);
  const [ready, setReady] = useState(false);
  const pendingRef = useRef(null);

  const parse = useCallback(async (uri) => {
    if (!ready) throw new Error('ตัวอ่าน PDF ยังไม่พร้อม กรุณารอสักครู่แล้วลองใหม่');
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return new Promise((resolve, reject) => {
      pendingRef.current = { resolve, reject };
      const safe = JSON.stringify(b64);
      webRef.current?.injectJavaScript(`window.parseBase64(${safe}); true;`);
    });
  }, [ready]);

  useImperativeHandle(ref, () => ({ parse, ready }), [parse, ready]);

  return (
    <WebView
      ref={webRef}
      originWhitelist={['*']}
      source={{ html: HTML }}
      javaScriptEnabled
      domStorageEnabled
      style={{ position: 'absolute', width: 0, height: 0 }}
      onMessage={(e) => {
        let msg;
        try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
        if (msg.ready) { setReady(true); return; }
        if (!pendingRef.current) return;
        const { resolve, reject } = pendingRef.current;
        pendingRef.current = null;
        if (msg.ok) resolve(msg.rows);
        else reject(new Error(msg.error || 'Parse failed'));
      }}
    />
  );
});

import './polyfills.js';
import { state } from './state.js';
import { render } from './screens.js';
import { showTutorial, showTutorialFirstTime } from './tutorial.js';
import './style.css';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}

state.go = (step) => { state.step = step; render(); };

async function pickupSharedFile() {
  const params = new URLSearchParams(location.search);
  if (!params.has('shared')) return null;
  history.replaceState({}, '', location.pathname);
  try {
    const cache = await caches.open('bms-ts-shared');
    const res = await cache.match('shared-file');
    if (!res) return null;
    await cache.delete('shared-file');
    const blob = await res.blob();
    const filename = decodeURIComponent(res.headers.get('X-Filename') || 'shared.pdf');
    return new File([blob], filename, { type: 'application/pdf' });
  } catch { return null; }
}

(async () => {
  state.sharedFile = await pickupSharedFile();
  state.go('import');
  document.getElementById('helpBtn')?.addEventListener('click', showTutorial);
  showTutorialFirstTime();
})();

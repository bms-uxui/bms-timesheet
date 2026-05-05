import './polyfills.js';
import { state } from './state.js';
import { render } from './screens.js';
import './style.css';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}

state.go = (step) => { state.step = step; render(); };
state.go('import');

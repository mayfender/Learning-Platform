import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/fonts';
import '@/styles/tokens.css';
import '@/styles/global.css';
import { applyTheme, readTheme } from '@/app/theme';
import { App } from '@/app/App';

applyTheme(readTheme());

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('ไม่พบ #root');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

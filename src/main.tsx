// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/tokens.css';
import './styles/base.css';
import './styles/animations.css';
import './styles/layout/header.css';
import './styles/layout/board.css';
import './styles/layout/sidebar.css';
import './styles/components/buttons.css';
import './styles/components/modals.css';
import './styles/components/scoring.css';
import './styles/components/gameover.css';
import './styles/components/loading-screen.css';
import './styles/components/travelers.css';
import './styles/components/lobby.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

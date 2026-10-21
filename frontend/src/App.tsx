import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import PaperPage from './pages/PaperPage';
import './App.css';

export const App: React.FC = () => {
  // Current view: { page: 'home' } | { page: 'paper', arxivId: string }
  const [currentRoute, setCurrentRoute] = useState<{
    page: 'home' | 'paper';
    arxivId?: string;
  }>(() => {
    // Check initial hash route e.g. #/paper/1706.03762
    const hash = window.location.hash;
    const match = hash.match(/^#\/paper\/([a-zA-Z0-9\.\/_-]+)$/);
    if (match) {
      return { page: 'paper', arxivId: match[1] };
    }
    return { page: 'home' };
  });

  // Sync hash changes with state
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/^#\/paper\/([a-zA-Z0-9\.\/_-]+)$/);
      if (match) {
        setCurrentRoute({ page: 'paper', arxivId: match[1] });
      } else {
        setCurrentRoute({ page: 'home' });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToPaper = (arxivId: string) => {
    const clean = arxivId.trim().toLowerCase().replace(/^arxiv:/, '');
    window.location.hash = `#/paper/${clean}`;
    setCurrentRoute({ page: 'paper', arxivId: clean });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToHome = () => {
    window.location.hash = '';
    setCurrentRoute({ page: 'home' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-root">
      <Navbar onHomeClick={navigateToHome} />

      <main className="app-main-content">
        {currentRoute.page === 'home' && (
          <HomePage onSelectPaper={navigateToPaper} />
        )}

        {currentRoute.page === 'paper' && currentRoute.arxivId && (
          <PaperPage
            arxivId={currentRoute.arxivId}
            onBack={navigateToHome}
            onNavigatePaper={navigateToPaper}
          />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-container">
          <p className="footer-notice">
            Paper Crawler adheres to official arXiv API terms of service (3-second rate limiting,
            Atom queries, canonical source linking). PDFs are not re-hosted.
          </p>
          <p className="footer-copy">
            Built with FastAPI, PyMuPDF, PostgreSQL, pgvector, and React.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;

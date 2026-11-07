import React, { Suspense, lazy, useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Toaster } from '@/components/ui/sonner';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const DiscoverPage = lazy(() => import('@/pages/DiscoverPage'));
const PaperPage = lazy(() => import('@/pages/PaperPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

type RouteState =
  | { page: 'home' }
  | { page: 'discover'; initialQuery?: string }
  | { page: 'paper'; arxivId: string }
  | { page: 'notfound' };

export const App: React.FC = () => {
  const parseHash = (): RouteState => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (!hash || hash === '') {
      return { page: 'home' };
    }

    if (hash === 'discover') {
      return { page: 'discover' };
    }

    const paperMatch = hash.match(/^paper\/([a-zA-Z0-9./_-]+)$/);
    if (paperMatch) {
      return { page: 'paper', arxivId: paperMatch[1] };
    }

    return { page: 'notfound' };
  };

  const [currentRoute, setCurrentRoute] = useState<RouteState>(parseHash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(parseHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToHome = () => {
    window.location.hash = '#/';
    setCurrentRoute({ page: 'home' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToDiscover = (query?: string) => {
    window.location.hash = '#/discover';
    setCurrentRoute({ page: 'discover', initialQuery: query });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToPaper = (arxivId: string) => {
    const clean = arxivId.trim().toLowerCase().replace(/^arxiv:/, '');
    window.location.hash = `#/paper/${clean}`;
    setCurrentRoute({ page: 'paper', arxivId: clean });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--cream)] text-[var(--navy)]">
      <Toaster position="bottom-right" richColors />

      {/* Navigation */}
      <Navbar
        onHomeClick={navigateToHome}
        onDiscoverClick={() => navigateToDiscover()}
        currentRoute={currentRoute.page}
      />

      {/* Main View with Suspense */}
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--navy)] border-t-transparent" />
            </div>
          }
        >
          {currentRoute.page === 'home' && (
            <LandingPage
              onSearchSubmit={(query) => {
                if (/^[0-9]{4}\.[0-9]{4,5}/.test(query.trim())) {
                  navigateToPaper(query.trim());
                } else {
                  navigateToDiscover(query);
                }
              }}
              onNavigateDiscover={() => navigateToDiscover()}
            />
          )}

          {currentRoute.page === 'discover' && (
            <DiscoverPage
              onSelectPaper={navigateToPaper}
              initialQuery={currentRoute.initialQuery}
            />
          )}

          {currentRoute.page === 'paper' && (
            <PaperPage
              arxivId={currentRoute.arxivId}
              onBack={() => navigateToDiscover()}
              onNavigatePaper={navigateToPaper}
            />
          )}

          {currentRoute.page === 'notfound' && (
            <NotFoundPage
              onNavigateHome={navigateToHome}
              onNavigateDiscover={() => navigateToDiscover()}
            />
          )}
        </Suspense>
      </main>
    </div>
  );
};

export default App;

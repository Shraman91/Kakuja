import React, { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, GitBranch, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavbarProps {
  onHomeClick: () => void;
  onDiscoverClick: () => void;
  currentRoute: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onHomeClick,
  onDiscoverClick,
  currentRoute,
}) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isDarkHero = currentRoute === 'home' && !scrolled;

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        scrolled
          ? 'bg-[var(--cream)]/90 backdrop-blur-md shadow-navy-sm py-2.5 border-b border-[var(--border)]'
          : isDarkHero
          ? 'bg-transparent py-4 text-[var(--cream)]'
          : 'bg-transparent py-4 text-[var(--navy)]'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        {/* Brand Logo & Wordmark */}
        <div
          onClick={onHomeClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onHomeClick();
          }}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-navy-sm group-hover:scale-105 transition-all duration-200 ${
              isDarkHero
                ? 'bg-[var(--accent)] text-[var(--navy-ink)] font-bold'
                : 'bg-[var(--navy)] text-[var(--cream)]'
            }`}
          >
            <BookOpen size={18} />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-serif-display text-2xl font-normal tracking-tight transition-colors ${
                isDarkHero
                  ? 'text-[var(--cream)] group-hover:text-white'
                  : 'text-[var(--navy)] group-hover:text-[var(--navy-ink)]'
              }`}
            >
              Kakuja
            </span>
            <span
              className={`hidden sm:inline-block rounded-md border px-2 py-0.5 text-[10px] font-mono-code font-semibold transition-colors ${
                isDarkHero
                  ? 'border-white/15 bg-white/10 text-[var(--cream)]/85'
                  : 'border-[var(--border)] bg-[var(--cream-deep)]/60 text-[var(--navy-soft)]'
              }`}
            >
              arXiv reader
            </span>
          </div>
        </div>

        {/* Clean Nav Links */}
        <nav className="flex items-center gap-2">
          <Button
            variant={currentRoute === 'discover' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onDiscoverClick}
            className={`text-xs h-9 transition-colors ${
              isDarkHero
                ? 'text-[var(--cream)] hover:bg-[var(--navy-soft)]/60 hover:text-[var(--accent)]'
                : ''
            }`}
          >
            <Compass size={14} className="mr-1.5" />
            <span>Discover</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            asChild
            className={`text-xs h-9 hidden sm:inline-flex transition-colors ${
              isDarkHero
                ? 'text-[var(--cream)]/85 hover:bg-[var(--navy-soft)]/60 hover:text-[var(--cream)]'
                : ''
            }`}
          >
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5"
            >
              <span>API Docs</span>
              <ExternalLink size={12} className="opacity-70" />
            </a>
          </Button>

          <Button
            variant="outline"
            size="sm"
            asChild
            className={`text-xs h-9 transition-colors ${
              isDarkHero
                ? 'border-white/20 bg-[var(--navy-soft)]/50 text-[var(--cream)] hover:bg-[var(--navy-soft)] hover:text-white'
                : 'border-[var(--border)] bg-[var(--paper)] text-[var(--navy)] hover:bg-[var(--cream-deep)]'
            }`}
          >
            <a
              href="https://github.com/Shraman91/Kakuja"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5"
            >
              <GitBranch size={13} />
              <span>GitHub</span>
            </a>
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;

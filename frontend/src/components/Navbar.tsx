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

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        scrolled
          ? 'bg-[var(--cream)]/90 backdrop-blur-md shadow-navy-sm py-2.5 border-b border-[var(--border)]'
          : 'bg-transparent py-4'
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--navy)] text-[var(--cream)] shadow-navy-sm group-hover:scale-105 transition-transform duration-200">
            <BookOpen size={18} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif-display text-2xl font-normal tracking-tight text-[var(--navy)] group-hover:text-[var(--navy-ink)]">
              Kakuja
            </span>
            <span className="hidden sm:inline-block rounded-md border border-[var(--border)] bg-[var(--cream-deep)]/60 px-2 py-0.5 text-[10px] font-mono-code font-semibold text-[var(--navy-soft)]">
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
            className="text-xs h-9"
          >
            <Compass size={14} className="mr-1.5" />
            <span>Discover</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-xs h-9 hidden sm:inline-flex"
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
            className="text-xs h-9 border-[var(--border)] bg-[var(--paper)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"
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

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Compass, FileQuestion } from 'lucide-react';

interface NotFoundPageProps {
  onNavigateHome: () => void;
  onNavigateDiscover: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onNavigateHome,
  onNavigateDiscover,
}) => {
  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center px-6 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-10 shadow-navy-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--cream-deep)] text-[var(--accent)] mb-6 shadow-navy-sm">
          <FileQuestion size={32} />
        </div>

        <span className="font-mono-code text-xs font-semibold text-[var(--navy-soft)] uppercase tracking-widest">
          Error 404
        </span>

        <h1 className="mt-2 font-serif-display text-4xl text-[var(--navy)] tracking-tight">
          Page Not Found
        </h1>

        <p className="mt-3 text-sm text-[var(--navy-soft)] leading-relaxed">
          The requested coordinate does not exist in our vector index or the arXiv paper reference is invalid.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Button variant="outline" onClick={onNavigateHome} className="w-full sm:w-auto">
            <ArrowLeft size={14} className="mr-2" />
            <span>Home</span>
          </Button>

          <Button variant="default" onClick={onNavigateDiscover} className="w-full sm:w-auto">
            <Compass size={14} className="mr-2" />
            <span>Discover Papers</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;

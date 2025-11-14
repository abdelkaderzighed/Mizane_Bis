import React from 'react';
import { Footer } from './Footer';
import { Button } from './ui/button';
import { ChevronsDown, ChevronsUp } from 'lucide-react';

interface CollapsibleFooterProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function CollapsibleFooter({ collapsed, onToggle }: CollapsibleFooterProps) {
  return (
    <div className="border-t border-border bg-muted/20">
      <div className="max-w-7xl mx-auto px-6 py-2 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 flex items-center gap-2 text-muted-foreground hover:text-foreground"
          onClick={onToggle}
        >
          {collapsed ? (
            <>
              <ChevronsUp className="w-4 h-4" />
              Afficher le pied de page
            </>
          ) : (
            <>
              <ChevronsDown className="w-4 h-4" />
              Replier le pied de page
            </>
          )}
        </Button>
      </div>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'max-h-0 opacity-0' : 'max-h-[480px] opacity-100'}`}
      >
        {!collapsed && <Footer />}
      </div>
    </div>
  );
}

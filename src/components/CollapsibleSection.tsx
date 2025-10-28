import { useState, ReactNode, memo, useCallback } from 'react';
import { ChevronDownIcon } from './Icons';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  activeIndicator?: boolean;
  resetAction?: () => void;
  className?: string;
}

export const CollapsibleSection = memo<CollapsibleSectionProps>(({
  title,
  children,
  defaultOpen = true,
  activeIndicator = false,
  resetAction,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  return (
    <div className={`border-t border-zinc-200 dark:border-zinc-700 ${className}`}>
      <div 
        className="flex justify-between items-center py-3 cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 rounded-md transition-colors p-1 -m-1"
        onClick={toggleOpen}
      >
        <h4 className="text-base font-semibold text-zinc-800 dark:text-zinc-100 flex items-center">
          {title}
          {activeIndicator && (
            <span className="ml-2 w-2 h-2 rounded-full bg-green-500"></span>
          )}
        </h4>
        <div className="flex items-center gap-2">
          {resetAction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetAction();
              }}
              className="px-3 py-1.5 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 active:scale-95 transition-all duration-150 font-medium"
            >
              Reset
            </button>
          )}
          <button 
            className="p-1 rounded text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all duration-150"
            onClick={(e) => {
              e.stopPropagation();
              toggleOpen();
            }}
          >
            <div className={`transform transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
              <ChevronDownIcon className="w-5 h-5" />
            </div>
          </button>
        </div>
      </div>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pt-2 pb-4 transition-opacity duration-300">
          {children}
        </div>
      </div>
    </div>
  );
});
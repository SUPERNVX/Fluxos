import { useState, ReactNode, memo, useCallback } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip = memo<TooltipProps>(({
  content,
  children,
  position = 'top',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const showTooltip = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideTooltip = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Calculate position classes based on the position prop
  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {isVisible && (
        <div 
          className={`absolute z-50 px-2 py-1 bg-zinc-800 text-white text-xs rounded-md whitespace-nowrap ${positionClasses[position]} ${className}`}
        >
          {content}
          <div className={`absolute w-2 h-2 bg-zinc-800 rotate-45 ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2' : ''} ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2' : ''} ${position === 'left' ? 'right-full top-1/2 translate-y-1/2' : ''} ${position === 'right' ? 'left-full top-1/2 -translate-y-1/2' : ''}`}></div>
        </div>
      )}
    </div>
  );
});
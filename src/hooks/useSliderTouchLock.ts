import { useCallback } from 'react';

export const useSliderTouchLock = () => {
  const onPointerDown = useCallback(() => {
    document.body.classList.add('overflow-hidden');
    const onPointerUp = () => {
      document.body.classList.remove('overflow-hidden');
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }, []);
  return onPointerDown;
};
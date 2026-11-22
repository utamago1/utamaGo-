import { useEffect } from 'react';
import type { TextScale } from '../utils/storage';

export function applyTextScaleToDocument(scale: TextScale): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (scale === 'large') {
    root.style.fontSize = '112.5%';
  } else if (scale === 'xlarge') {
    root.style.fontSize = '125%';
  } else {
    root.style.fontSize = '100%';
  }
}

export function useTextScaleEffect(scale: TextScale): void {
  useEffect(() => {
    applyTextScaleToDocument(scale);
  }, [scale]);
}

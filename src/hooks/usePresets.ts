import { useState, useCallback } from 'react';

export const usePresets = () => {
  const [presets, setPresets] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('fluxos-presets');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Error reading presets from localStorage", error);
      return [];
    }
  });

  const savePreset = useCallback((name: string, settings: any) => {
    const newPreset = { id: Date.now(), name, settings };
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('fluxos-presets', JSON.stringify(updatedPresets));
  }, [presets]);

  const deletePreset = useCallback((id: number) => {
    const updatedPresets = presets.filter(p => p.id !== id);
    setPresets(updatedPresets);
    localStorage.setItem('fluxos-presets', JSON.stringify(updatedPresets));
  }, [presets]);

  const updatePreset = useCallback((id: number, settings: any) => {
    const updatedPresets = presets.map(p => p.id === id ? { ...p, settings } : p);
    setPresets(updatedPresets);
    localStorage.setItem('fluxos-presets', JSON.stringify(updatedPresets));
  }, [presets]);

  return { presets, savePreset, deletePreset, updatePreset };
};
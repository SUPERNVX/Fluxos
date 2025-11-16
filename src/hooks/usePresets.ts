import { useState, useCallback } from 'react';
import type { PresetSettings } from '../types/audio';

export const usePresets = () => {
  type Preset = { id: number; name: string; settings: PresetSettings };
  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      const saved = localStorage.getItem('fluxos-presets');
      if (!saved) return [];
      const parsed = JSON.parse(saved) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((p) => {
            const id = typeof p.id === 'number' ? p.id : Date.now();
            const name = typeof p.name === 'string' ? p.name : 'Preset';
            return { id, name, settings: p.settings as PresetSettings } as Preset;
          });
      }
      return [];
    } catch (error) {
      console.error("Error reading presets from localStorage", error);
      return [];
    }
  });

  const savePreset = useCallback((name: string, settings: PresetSettings) => {
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

  const updatePreset = useCallback((id: number, settings: PresetSettings) => {
    const updatedPresets = presets.map(p => p.id === id ? { ...p, settings } : p);
    setPresets(updatedPresets);
    localStorage.setItem('fluxos-presets', JSON.stringify(updatedPresets));
  }, [presets]);

  return { presets, savePreset, deletePreset, updatePreset };
};
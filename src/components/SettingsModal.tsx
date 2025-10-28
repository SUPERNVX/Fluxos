import { useState, memo } from 'react';
import { CloseIcon, TrashIcon } from './Icons';

export const SettingsModal = memo<{
  isOpen: boolean;
  onClose: () => void;
  presets: any[];
  onSave: (name: string) => void;
  onLoad: (settings: any, id: number) => void;
  onDelete: (id: number) => void;
}>(({ isOpen, onClose, presets, onSave, onLoad, onDelete }) => {
  const [name, setName] = useState('');



  if (!isOpen) return null;

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      setName('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-light-bg dark:bg-dark-bg-secondary w-full max-w-md rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">Presets</h2>
          <button onClick={onClose} className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-md font-semibold text-zinc-700 dark:text-zinc-300">Save Current Settings</h3>
          <div className="flex gap-2">
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Preset name..."
              className="flex-1 bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button 
              onClick={handleSave}
              className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!name.trim()}
            >
              Save
            </button>
          </div>
        </div>

        <hr className="my-6 border-zinc-200 dark:border-zinc-700" />

        <div className="space-y-3">
          <h3 className="text-md font-semibold text-zinc-700 dark:text-zinc-300">Load Preset</h3>
          {presets.length > 0 ? (
            <ul className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {presets.map(preset => (
                <li key={preset.id} className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-700/50 p-3 rounded-lg">
                  <span className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
                    {preset.name}
                  </span>
                  <div className="flex gap-2">

                    <button 
                      onClick={() => onLoad(preset.settings, preset.id)}
                      className="px-3 py-1 text-sm bg-zinc-200 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200 font-semibold rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-500 transition-colors"
                    >
                      Load
                    </button>
                    <button 
                      onClick={() => onDelete(preset.id)}
                      className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-500 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">No saved presets.</p>
          )}
        </div>
      </div>
    </div>
  );
});
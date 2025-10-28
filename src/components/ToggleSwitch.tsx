import { memo } from 'react';

export const ToggleSwitch = memo<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}>(({ label, checked, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-100 dark:focus:ring-offset-zinc-800 focus:ring-accent ${
        checked ? 'bg-accent' : 'bg-zinc-300 dark:bg-zinc-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
));
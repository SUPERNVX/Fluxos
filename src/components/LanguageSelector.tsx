import { memo } from 'react';
import { useLanguage } from '../hooks/useLanguage';

export const LanguageSelector = memo(() => {
  const { currentLanguage, availableLanguages, changeLanguage, loading } = useLanguage();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    changeLanguage(e.target.value);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-select" className="text-sm text-zinc-700 dark:text-zinc-300">
        Language:
      </label>
      <select
        id="language-select"
        value={currentLanguage}
        onChange={handleChange}
        disabled={loading}
        className="bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
      >
        {availableLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
});
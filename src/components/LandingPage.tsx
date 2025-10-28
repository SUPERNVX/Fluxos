import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropzone } from './Dropzone';
import { LanguageSelector } from './LanguageSelector';

export const LandingPage = memo<{ onFileSelect: (file: File) => void }>(({ onFileSelect }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 text-center">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>
      <h1 className="text-4xl md:text-5xl font-bold text-zinc-800 dark:text-zinc-100 mb-2">Fluxos</h1>
      <p className="text-lg text-zinc-500 dark:text-zinc-400 mb-12">{t('player.dropzoneSubtitle')}</p>
      <Dropzone onFileSelect={onFileSelect} />
    </div>
  );
});
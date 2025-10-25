import { memo } from 'react';
import { Dropzone } from './Dropzone';

export const LandingPage = memo<{ onFileSelect: (file: File) => void }>(({ onFileSelect }) => (
  <div className="min-h-screen flex flex-col justify-center items-center p-4 text-center">
    <h1 className="text-4xl md:text-5xl font-bold text-zinc-800 dark:text-zinc-100 mb-2">Fluxos</h1>
    <p className="text-lg text-zinc-500 dark:text-zinc-400 mb-12">Seu laboratório de música pessoal.</p>
    <Dropzone onFileSelect={onFileSelect} />
  </div>
));
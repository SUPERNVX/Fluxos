// Lazy loading para componentes de efeitos
import { lazy, Suspense } from 'react';
import React from 'react';

// Componente de loading
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
    <span className="ml-2 text-sm text-gray-600">Carregando...</span>
  </div>
);

// Lazy load dos componentes de efeitos
const LazyDistortionControls = lazy(() => import('./DistortionControls').then(module => ({ default: module.DistortionControls })));
const LazyModulationControls = lazy(() => import('./ModulationControls').then(module => ({ default: module.ModulationControls })));
const LazySpatialAudioControls = lazy(() => import('./SpatialAudioControls').then(module => ({ default: module.SpatialAudioControls })));
const LazyEightDControls = lazy(() => import('./EightDControls').then(module => ({ default: module.EightDControls })));
const LazyMuffledControls = lazy(() => import('./MuffledControls').then(module => ({ default: module.MuffledControls })));

// HOC para wrapper com Suspense
const withLazyLoading = <P extends object>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<P>>,
  fallback?: React.ReactNode
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <Suspense fallback={fallback || <LoadingSpinner />}>
      <LazyComponent {...props} ref={ref} />
    </Suspense>
  ));
};

// Componentes exportados com lazy loading
export const DistortionControls = withLazyLoading(LazyDistortionControls);
export const ModulationControls = withLazyLoading(LazyModulationControls);
export const SpatialAudioControls = withLazyLoading(LazySpatialAudioControls);
export const EightDControls = withLazyLoading(LazyEightDControls);
export const MuffledControls = withLazyLoading(LazyMuffledControls);

// Hook para pré-carregar componentes quando necessário
export const usePreloadComponents = () => {
  const preloadDistortion = () => import('./DistortionControls');
  const preloadModulation = () => import('./ModulationControls');
  const preloadSpatial = () => import('./SpatialAudioControls');
  const preloadEightD = () => import('./EightDControls');
  const preloadMuffled = () => import('./MuffledControls');

  return {
    preloadDistortion,
    preloadModulation,
    preloadSpatial,
    preloadEightD,
    preloadMuffled,
    preloadAll: () => {
      preloadDistortion();
      preloadModulation();
      preloadSpatial();
      preloadEightD();
      preloadMuffled();
    }
  };
};

// Componente para gerenciar carregamento inteligente
interface SmartLoaderProps {
  children: React.ReactNode;
  enablePreloading?: boolean;
  preloadDelay?: number;
}

export const SmartLoader: React.FC<SmartLoaderProps> = ({
  children,
  enablePreloading = true,
  preloadDelay = 2000
}) => {
  const { preloadAll } = usePreloadComponents();

  React.useEffect(() => {
    if (!enablePreloading) return;

    // Pré-carrega componentes após um delay
    const timer = setTimeout(() => {
      // Só pré-carrega se o usuário não estiver navegando ativamente
      if (document.visibilityState === 'visible') {
        preloadAll();
      }
    }, preloadDelay);

    return () => clearTimeout(timer);
  }, [enablePreloading, preloadDelay, preloadAll]);

  return <>{children}</>;
};
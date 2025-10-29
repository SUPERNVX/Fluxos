// Sistema avançado de gerenciamento de memória
import { ErrorHandler, ERROR_CODES } from './errorHandler';

interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  memoryUsagePercentage: number;
}

interface ManagedResource {
  id: string;
  type: 'audioBuffer' | 'blob' | 'objectUrl' | 'canvas' | 'imageData';
  size: number;
  timestamp: number;
  data: any;
}

export class MemoryManager {
  private static resources = new Map<string, ManagedResource>();
  private static maxMemoryUsage = 0.85; // 85% do limite (mais tolerante)
  private static cleanupThreshold = 0.95; // 95% do limite (muito mais tolerante)
  private static maxResourceAge = 10 * 60 * 1000; // 10 minutos (mais tempo antes da limpeza)
  private static currentFileSize = 0; // Track do tamanho do arquivo atual

  // Registra um recurso para gerenciamento
  static registerResource(
    id: string, 
    type: ManagedResource['type'], 
    data: any, 
    size?: number
  ): string {
    const resourceSize = size || this.estimateSize(data, type);
    
    const resource: ManagedResource = {
      id,
      type,
      size: resourceSize,
      timestamp: Date.now(),
      data
    };

    this.resources.set(id, resource);
    
    // Verifica se precisa fazer limpeza
    this.checkMemoryUsage();
    
    return id;
  }

  // Remove um recurso específico
  static releaseResource(id: string): boolean {
    const resource = this.resources.get(id);
    if (!resource) return false;

    // Limpeza específica por tipo
    this.cleanupResourceData(resource);
    this.resources.delete(id);
    
    return true;
  }

  // Limpeza automática baseada na idade dos recursos
  static performAutoCleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;
    const oldResources: string[] = [];

    // Identifica recursos antigos
    this.resources.forEach((resource, id) => {
      if (now - resource.timestamp > this.maxResourceAge) {
        oldResources.push(id);
      }
    });

    // Remove recursos antigos
    oldResources.forEach(id => {
      if (this.releaseResource(id)) {
        cleanedCount++;
      }
    });

    return cleanedCount;
  }

  // Limpeza forçada quando memória está alta
  static performEmergencyCleanup(): number {
    let cleanedCount = 0;
    const resourcesByAge = Array.from(this.resources.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove os 50% mais antigos
    const toRemove = Math.ceil(resourcesByAge.length * 0.5);
    for (let i = 0; i < toRemove; i++) {
      const [id] = resourcesByAge[i];
      if (this.releaseResource(id)) {
        cleanedCount++;
      }
    }

    // Force garbage collection se disponível
    if ('gc' in window && typeof window.gc === 'function') {
      window.gc();
    }

    return cleanedCount;
  }

  // Define o tamanho do arquivo atual para ajustar comportamento
  static setCurrentFileSize(sizeInBytes: number): void {
    this.currentFileSize = sizeInBytes;
  }

  // Verifica se deve mostrar pop-up baseado no tamanho do arquivo
  private static shouldShowPopup(): boolean {
    const fileSizeMB = this.currentFileSize / (1024 * 1024);
    return fileSizeMB > 70; // Só mostra pop-up para arquivos > 70MB
  }

  // Verifica uso de memória e executa limpeza se necessário
  static checkMemoryUsage(): MemoryStats | null {
    const stats = this.getMemoryStats();
    if (!stats) return null;

    // Ajusta thresholds baseado no tamanho do arquivo
    const fileSizeMB = this.currentFileSize / (1024 * 1024);
    let adjustedCleanupThreshold = this.cleanupThreshold;
    let adjustedMaxUsage = this.maxMemoryUsage;

    // Para arquivos pequenos (<20MB), seja mais tolerante
    if (fileSizeMB < 20) {
      adjustedCleanupThreshold = 0.98; // 98%
      adjustedMaxUsage = 0.92; // 92%
    }
    // Para arquivos médios (20-50MB), tolerância média
    else if (fileSizeMB < 50) {
      adjustedCleanupThreshold = 0.96; // 96%
      adjustedMaxUsage = 0.88; // 88%
    }

    if (stats.memoryUsagePercentage > adjustedCleanupThreshold) {
      // Só mostra pop-up para arquivos grandes
      if (this.shouldShowPopup()) {
        ErrorHandler.logError(
          ERROR_CODES.OUT_OF_MEMORY,
          'Uso de memória crítico, executando limpeza de emergência',
          `Uso: ${stats.memoryUsagePercentage.toFixed(1)}% | Arquivo: ${fileSizeMB.toFixed(1)}MB`
        );
      }
      
      const cleaned = this.performEmergencyCleanup();
      console.log(`Limpeza de emergência: ${cleaned} recursos removidos (arquivo: ${fileSizeMB.toFixed(1)}MB)`);
    } else if (stats.memoryUsagePercentage > adjustedMaxUsage) {
      const cleaned = this.performAutoCleanup();
      if (cleaned > 0) {
        console.log(`Limpeza automática: ${cleaned} recursos removidos (uso: ${stats.memoryUsagePercentage.toFixed(1)}%)`);
      }
    }

    return stats;
  }

  // Obtém estatísticas de memória
  static getMemoryStats(): MemoryStats | null {
    if (!('memory' in performance)) return null;

    const memory = (performance as any).memory;
    const memoryUsagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      memoryUsagePercentage
    };
  }

  // Estima o tamanho de um recurso
  private static estimateSize(data: any, type: ManagedResource['type']): number {
    switch (type) {
      case 'audioBuffer':
        if (data.length && data.numberOfChannels && data.sampleRate) {
          return data.length * data.numberOfChannels * 4; // 4 bytes por sample (Float32)
        }
        return 0;
        
      case 'blob':
        return data.size || 0;
        
      case 'canvas':
        if (data.width && data.height) {
          return data.width * data.height * 4; // 4 bytes por pixel (RGBA)
        }
        return 0;
        
      case 'imageData':
        return data.data ? data.data.length : 0;
        
      default:
        return JSON.stringify(data).length * 2; // Estimativa UTF-16
    }
  }

  // Limpeza específica por tipo de recurso
  private static cleanupResourceData(resource: ManagedResource): void {
    try {
      switch (resource.type) {
        case 'objectUrl':
          if (typeof resource.data === 'string') {
            URL.revokeObjectURL(resource.data);
          }
          break;
          
        case 'canvas':
          if (resource.data.getContext) {
            const ctx = resource.data.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, resource.data.width, resource.data.height);
            }
          }
          break;
          
        case 'audioBuffer':
          // AudioBuffer não pode ser limpo diretamente, apenas removemos a referência
          break;
          
        case 'blob':
          // Blob será coletado pelo GC automaticamente
          break;
      }
    } catch (error) {
      console.warn('Erro na limpeza de recurso:', error);
    }
  }

  // Relatório de uso de recursos
  static getResourcesReport(): {
    totalResources: number;
    totalSize: number;
    byType: Record<string, { count: number; size: number }>;
  } {
    const byType: Record<string, { count: number; size: number }> = {};
    let totalSize = 0;

    this.resources.forEach(resource => {
      totalSize += resource.size;
      
      if (!byType[resource.type]) {
        byType[resource.type] = { count: 0, size: 0 };
      }
      
      byType[resource.type].count++;
      byType[resource.type].size += resource.size;
    });

    return {
      totalResources: this.resources.size,
      totalSize,
      byType
    };
  }

  // Inicia monitoramento automático (menos frequente para reduzir overhead)
  static startAutoMonitoring(intervalMs: number = 60000): void { // 1 minuto em vez de 30s
    setInterval(() => {
      // Só executa limpeza automática se não estiver processando algo importante
      if (this.resources.size > 5) { // Só monitora se há recursos significativos
        this.performAutoCleanup(); // Só limpeza automática, não checkMemoryUsage completo
      }
    }, intervalMs);
  }

  // Para situações de emergência
  static forceCleanupAll(): void {
    const allIds = Array.from(this.resources.keys());
    allIds.forEach(id => this.releaseResource(id));
    
    // Force garbage collection se disponível
    if ('gc' in window && typeof window.gc === 'function') {
      window.gc();
    }
  }
}

// Auto-inicia o monitoramento
MemoryManager.startAutoMonitoring();
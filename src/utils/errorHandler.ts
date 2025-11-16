// Sistema de monitoramento e tratamento de erros
export interface AppError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

export class ErrorHandler {
  private static errors: AppError[] = [];
  private static listeners: ((error: AppError) => void)[] = [];

  static logError(code: string, message: string, details?: string, context?: Record<string, unknown>): AppError {
    const error: AppError = {
      code,
      message,
      details,
      timestamp: new Date(),
      context
    };

    this.errors.push(error);
    
    // Manter apenas os últimos 50 erros para evitar vazamento de memória
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }

    // Notificar listeners (UI)
    this.listeners.forEach(listener => listener(error));

    // Log para console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${code}] ${message}`, { details, context });
    }

    return error;
  }

  static addErrorListener(listener: (error: AppError) => void) {
    this.listeners.push(listener);
  }

  static removeErrorListener(listener: (error: AppError) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  static getRecentErrors(count: number = 10): AppError[] {
    return this.errors.slice(-count);
  }

  static clearErrors() {
    this.errors = [];
  }
}

// Códigos de erro padronizados
export const ERROR_CODES = {
  // Upload de arquivo
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',
  FILE_CORRUPTED: 'FILE_CORRUPTED',
  
  // Processamento de áudio
  AUDIO_CONTEXT_FAILED: 'AUDIO_CONTEXT_FAILED',
  AUDIO_DECODE_FAILED: 'AUDIO_DECODE_FAILED',
  EFFECT_CREATION_FAILED: 'EFFECT_CREATION_FAILED',
  WORKLET_LOAD_FAILED: 'WORKLET_LOAD_FAILED',
  
  // Download
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  RENDER_FAILED: 'RENDER_FAILED',
  
  // Memória
  OUT_OF_MEMORY: 'OUT_OF_MEMORY',
  BUFFER_ALLOCATION_FAILED: 'BUFFER_ALLOCATION_FAILED',
  
  // Rede
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR'
} as const;

// Mensagens de erro amigáveis
export const ERROR_MESSAGES = {
  [ERROR_CODES.FILE_UPLOAD_FAILED]: 'Falha ao carregar o arquivo. Tente novamente.',
  [ERROR_CODES.FILE_TOO_LARGE]: 'Arquivo muito grande. Tamanho máximo: 100MB.',
  [ERROR_CODES.INVALID_FILE_FORMAT]: 'Formato de arquivo não suportado. Use MP3, WAV, OGG ou M4A.',
  [ERROR_CODES.FILE_CORRUPTED]: 'Arquivo corrompido ou inválido.',
  [ERROR_CODES.AUDIO_CONTEXT_FAILED]: 'Erro ao inicializar sistema de áudio.',
  [ERROR_CODES.AUDIO_DECODE_FAILED]: 'Erro ao decodificar arquivo de áudio.',
  [ERROR_CODES.EFFECT_CREATION_FAILED]: 'Erro ao criar efeito de áudio.',
  [ERROR_CODES.WORKLET_LOAD_FAILED]: 'Erro ao carregar processador de áudio.',
  [ERROR_CODES.DOWNLOAD_FAILED]: 'Erro ao baixar arquivo processado.',
  [ERROR_CODES.RENDER_FAILED]: 'Erro ao processar áudio para download.',
  [ERROR_CODES.OUT_OF_MEMORY]: 'Memória insuficiente. Tente um arquivo menor.',
  [ERROR_CODES.BUFFER_ALLOCATION_FAILED]: 'Erro de alocação de memória.',
  [ERROR_CODES.NETWORK_ERROR]: 'Erro de conexão. Verifique sua internet.',
  [ERROR_CODES.TIMEOUT_ERROR]: 'Operação expirou. Tente novamente.'
} as const;
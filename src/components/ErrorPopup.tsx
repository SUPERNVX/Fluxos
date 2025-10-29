import React, { useState, useEffect } from 'react';
import { ErrorHandler, AppError, ERROR_MESSAGES } from '../utils/errorHandler';

interface ErrorPopupProps {
  onClose?: () => void;
}

const ErrorPopup: React.FC<ErrorPopupProps> = ({ onClose }) => {
  const [currentError, setCurrentError] = useState<AppError | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleError = (error: AppError) => {
      setCurrentError(error);
      setIsVisible(true);
      
      // Auto-hide após 5 segundos
      setTimeout(() => {
        setIsVisible(false);
      }, 5000);
    };

    ErrorHandler.addErrorListener(handleError);

    return () => {
      ErrorHandler.removeErrorListener(handleError);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible || !currentError) return null;

  const errorMessage = ERROR_MESSAGES[currentError.code as keyof typeof ERROR_MESSAGES] || currentError.message;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-red-500 text-white rounded-lg shadow-lg p-4 transform transition-all duration-300 ease-in-out">
        <div className="flex items-start justify-between">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-200" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium">
                Erro
              </h3>
              <div className="mt-1 text-sm">
                <p>{errorMessage}</p>
                {currentError.details && (
                  <p className="mt-1 text-xs text-red-200">
                    {currentError.details}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="bg-red-500 rounded-md inline-flex text-red-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-500 focus:ring-white"
              onClick={handleClose}
            >
              <span className="sr-only">Fechar</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Barra de progresso para auto-hide */}
        <div className="mt-3 w-full bg-red-400 rounded-full h-1">
          <div 
            className="bg-white h-1 rounded-full transition-all duration-5000 ease-linear"
            style={{ 
              width: isVisible ? '0%' : '100%',
              transition: 'width 5s linear'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ErrorPopup;
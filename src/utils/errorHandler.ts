interface ErrorDetails {
  message: string;
  type: 'network' | 'validation' | 'api' | 'unknown';
  retryable: boolean;
  userMessage: string;
}

export class GameError extends Error {
  type: string;
  retryable: boolean;
  userMessage: string;

  constructor(message: string, type: string, retryable: boolean, userMessage: string) {
    super(message);
    this.type = type;
    this.retryable = retryable;
    this.userMessage = userMessage;
  }
}

export function handleError(error: any): ErrorDetails {
  console.error('🔴 Error occurred:', error);

  if (error instanceof GameError) {
    return {
      message: error.message,
      type: error.type as any,
      retryable: error.retryable,
      userMessage: error.userMessage,
    };
  }

  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    return {
      message: error.message,
      type: 'network',
      retryable: true,
      userMessage: 'Network error. Please check your connection and try again.',
    };
  }

  if (error.message?.includes('HTTP 500') || error.message?.includes('HTTP 503')) {
    return {
      message: error.message,
      type: 'api',
      retryable: true,
      userMessage: 'Server error. Please try again in a moment.',
    };
  }

  if (error.message?.includes('HTTP 4')) {
    return {
      message: error.message,
      type: 'validation',
      retryable: false,
      userMessage: 'Invalid request. Please refresh the page.',
    };
  }

  if (error.message?.includes('timeout')) {
    return {
      message: error.message,
      type: 'network',
      retryable: true,
      userMessage: 'Request timed out. Please try again.',
    };
  }

  return {
    message: error.message || 'Unknown error',
    type: 'unknown',
    retryable: true,
    userMessage: 'Something went wrong. Please try again.',
  };
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const errorDetails = handleError(error);

      if (!errorDetails.retryable) {
        throw new GameError(
          errorDetails.message,
          errorDetails.type,
          false,
          errorDetails.userMessage
        );
      }

      if (attempt < maxRetries) {
        console.log(`⏳ Retry attempt ${attempt}/${maxRetries} after ${delayMs}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  const errorDetails = handleError(lastError);
  throw new GameError(
    errorDetails.message,
    errorDetails.type,
    errorDetails.retryable,
    errorDetails.userMessage
  );
}

export function logError(context: string, error: any, additionalData?: any): void {
  console.group(`❌ ${context}`);
  console.error('Error:', error);
  if (additionalData) {
    console.error('Additional data:', additionalData);
  }
  console.groupEnd();
}

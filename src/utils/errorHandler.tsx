import React from 'react';
import toast from 'react-hot-toast';
import { CustomToast } from '../components/ui/CustomToast';

// Custom API Error class
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Error handler
export const handleApiError = (error: any): void => {
  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 401:
        console.error('Unauthorized - redirecting to login');
        window.location.href = '/login';
        break;
      case 403:
        console.error('Access forbidden');
        break;
      case 404:
        console.error('Resource not found');
        break;
      case 500:
        console.error('Server error');
        break;
      default:
        console.error(error.message);
    }
  } else {
    console.error('Unexpected error:', error);
  }
};

// Toast notification helpers with custom component
export const showErrorToast = (message: string): void => {
  toast.custom((t) => (
    <CustomToast type="error" message={message} toastId={t.id} />
  ), {
    duration: 5000,
    position: 'top-center',
  });
};

export const showSuccessToast = (message: string): void => {
  toast.custom((t) => (
    <CustomToast type="success" message={message} toastId={t.id} />
  ), {
    duration: 3000,
    position: 'top-center',
  });
};

export const showLoadingToast = (message: string): string => {
  return toast.custom((t) => (
    <CustomToast type="loading" message={message} toastId={t.id} />
  ), {
    position: 'top-center',
    duration: Infinity,
  });
};

export const showInfoToast = (message: string): void => {
  toast.custom((t) => (
    <CustomToast type="info" message={message} toastId={t.id} />
  ), {
    duration: 4000,
    position: 'top-center',
  });
};

// Generic error handler that returns error message
export const handleError = (error: any): string => {
  let errorMessage = 'An unexpected error occurred';

  if (error.response) {
    // Server responded with error
    errorMessage = error.response.data?.message || error.response.data?.title || error.message;
    
    if (error.response.status === 401) {
      errorMessage = 'Unauthorized. Please login again.';
    } else if (error.response.status === 403) {
      errorMessage = 'Access forbidden';
    } else if (error.response.status === 404) {
      errorMessage = 'Resource not found';
    } else if (error.response.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    }
  } else if (error.request) {
    // Request made but no response
    errorMessage = 'Network error. Please check your connection.';
  } else {
    // Something else happened
    errorMessage = error.message || errorMessage;
  }

  showErrorToast(errorMessage);
  return errorMessage;
};

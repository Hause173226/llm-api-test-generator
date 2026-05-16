import React from "react";
import toast from "react-hot-toast";
import { CustomToast } from "../components/ui/CustomToast";

// Custom API Error class
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: any,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Error handler
export const handleApiError = (error: any): void => {
  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 401:
        if (import.meta.env.DEV) console.error("Unauthorized - redirecting to login");
        window.location.href = "/login";
        break;
      case 403:
        if (import.meta.env.DEV) console.error("Access forbidden");
        break;
      case 404:
        if (import.meta.env.DEV) console.error("Resource not found");
        break;
      case 500:
        if (import.meta.env.DEV) console.error("Server error");
        break;
      default:
        if (import.meta.env.DEV) console.error(error.message);
    }
  } else {
    if (import.meta.env.DEV) console.error("Unexpected error:", error);
  }
};

// Toast notification helpers with custom component
type ToastOptions = any;

const defaultPositions = {
  position: "top-center",
};

export const showErrorToast = (
  message: string,
  options?: ToastOptions,
): void => {
  toast.custom(
    (t) => <CustomToast type="error" message={message} toastId={t.id} />,
    { ...{ duration: 5000 }, ...defaultPositions, ...options },
  );
};

export const showSuccessToast = (
  message: string,
  options?: ToastOptions,
): void => {
  toast.custom(
    (t) => <CustomToast type="success" message={message} toastId={t.id} />,
    { ...{ duration: 3000 }, ...defaultPositions, ...options },
  );
};

export const showLoadingToast = (
  message: string,
  options?: ToastOptions,
): string => {
  return toast.custom(
    (t) => <CustomToast type="loading" message={message} toastId={t.id} />,
    { ...defaultPositions, ...options, duration: Infinity },
  );
};

export const showInfoToast = (
  message: string,
  options?: ToastOptions,
): void => {
  toast.custom(
    (t) => <CustomToast type="info" message={message} toastId={t.id} />,
    { ...{ duration: 4000 }, ...defaultPositions, ...options },
  );
};

// Generic helper to show fully custom content but using the same toast.custom API
export const showCustomToast = (
  render: (t: { id: string }) => React.ReactNode,
  options?: ToastOptions,
): string => {
  return toast.custom(render, { ...defaultPositions, ...options });
};

// Generic error handler that returns error message
export const handleError = (
  error: any,
  navigate?: (path: string) => void,
  suppressToast = false,
): string => {
  if (import.meta.env.DEV) {
    console.log("handleError called with:", error);
    console.log("navigate function:", navigate ? "provided" : "NOT provided");
  }

  let errorMessage = "An unexpected error occurred";
  let shouldNavigateToBilling = false;

  // Handle ApiError (from our apiService)
  if (error instanceof ApiError) {
    errorMessage = error.message;

    // Check if it's a subscription-related error
    const errorText = (errorMessage || "").toLowerCase();

    if (import.meta.env.DEV) console.log("ApiError detection - errorText:", errorText);

    if (
      errorText.includes("subscription") ||
      errorText.includes("plan") ||
      errorText.includes("limit") ||
      errorText.includes("quota") ||
      errorText.includes("gói") ||
      errorText.includes("đăng ký") ||
      errorText.includes("không tìm thấy gói")
    ) {
      if (import.meta.env.DEV) console.log("Subscription error detected (ApiError)");
      shouldNavigateToBilling = true;
    } else {
      if (import.meta.env.DEV) console.log("Not a subscription error (ApiError)");
    }
  }
  // Handle axios-style errors
  else if (error.response) {
    // Server responded with error
    errorMessage =
      error.response.data?.message ||
      error.response.data?.detail ||
      error.response.data?.title ||
      error.message;

    // Check if it's a subscription-related error (any status code)
    const errorText = (errorMessage || "").toLowerCase();
    const responseData = JSON.stringify(
      error.response.data || {},
    ).toLowerCase();

    if (import.meta.env.DEV) {
      console.log("Error detection - errorText:", errorText);
      console.log("Error detection - responseData:", responseData);
    }

    if (
      errorText.includes("subscription") ||
      errorText.includes("plan") ||
      errorText.includes("limit") ||
      errorText.includes("quota") ||
      errorText.includes("gói") ||
      errorText.includes("đăng ký") ||
      errorText.includes("không tìm thấy gói") ||
      responseData.includes("subscription") ||
      responseData.includes("đăng ký gói") ||
      responseData.includes("gói dịch vụ")
    ) {
      if (import.meta.env.DEV) console.log("Subscription error detected (axios)");
      shouldNavigateToBilling = true;
    } else {
      if (import.meta.env.DEV) console.log("Not a subscription error (axios)");
    }

    // Status-specific messages
    if (error.response.status === 401) {
      errorMessage = "Unauthorized. Please login again.";
    } else if (error.response.status === 403) {
      errorMessage = errorMessage || "Access forbidden";
    } else if (error.response.status === 404) {
      errorMessage = errorMessage || "Resource not found";
    } else if (error.response.status === 500) {
      errorMessage = "Server error. Please try again later.";
    }
  } else if (error.request) {
    // Request made but no response
    errorMessage = "Network error. Please check your connection.";
  } else {
    // Something else happened
    errorMessage = error.message || errorMessage;
  }

  // Hide raw technical stack traces from end users.
  const isTechnicalMessage =
    /microsoft\.|entityframework|npgsql|stack trace|\sat\s[A-Za-z0-9_.]+\(/i.test(
      errorMessage,
    ) || errorMessage.length > 300;

  if (isTechnicalMessage) {
    const statusCode =
      error?.statusCode || error?.response?.status || error?.status || 500;

    if (statusCode === 404) {
      errorMessage = "Khong tim thay du lieu. Vui long thu lai.";
    } else if (statusCode === 400) {
      errorMessage = "Du lieu chua hop le. Vui long kiem tra va thu lai.";
    } else {
      errorMessage = "He thong dang ban. Vui long thu lai sau.";
    }
  }

  if (!suppressToast) {
    showErrorToast(errorMessage);
  }

  // Navigate to billing if subscription error detected
  if (shouldNavigateToBilling && navigate) {
    if (import.meta.env.DEV) console.log("Subscription error detected, navigating to billing page...");
    setTimeout(() => {
      navigate("/billing");
    }, 2000);
  }

  return errorMessage;
};

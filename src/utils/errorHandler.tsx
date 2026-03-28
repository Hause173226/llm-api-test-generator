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
        console.error("Unauthorized - redirecting to login");
        window.location.href = "/login";
        break;
      case 403:
        console.error("Access forbidden");
        break;
      case 404:
        console.error("Resource not found");
        break;
      case 500:
        console.error("Server error");
        break;
      default:
        console.error(error.message);
    }
  } else {
    console.error("Unexpected error:", error);
  }
};

// Toast notification helpers with custom component
export const showErrorToast = (message: string): void => {
  toast.custom(
    (t) => <CustomToast type="error" message={message} toastId={t.id} />,
    {
      duration: 5000,
      position: "top-center",
    },
  );
};

export const showSuccessToast = (message: string): void => {
  toast.custom(
    (t) => <CustomToast type="success" message={message} toastId={t.id} />,
    {
      duration: 3000,
      position: "top-center",
    },
  );
};

export const showLoadingToast = (message: string): string => {
  return toast.custom(
    (t) => <CustomToast type="loading" message={message} toastId={t.id} />,
    {
      position: "top-center",
      duration: Infinity,
    },
  );
};

export const showInfoToast = (message: string): void => {
  toast.custom(
    (t) => <CustomToast type="info" message={message} toastId={t.id} />,
    {
      duration: 4000,
      position: "top-center",
    },
  );
};

// Generic error handler that returns error message
export const handleError = (
  error: any,
  navigate?: (path: string) => void,
): string => {
  console.log("🔴 handleError called with:", error);
  console.log("🔴 navigate function:", navigate ? "provided" : "NOT provided");

  let errorMessage = "An unexpected error occurred";
  let shouldNavigateToBilling = false;

  // Handle ApiError (from our apiService)
  if (error instanceof ApiError) {
    errorMessage = error.message;

    // Check if it's a subscription-related error
    const errorText = (errorMessage || "").toLowerCase();

    console.log("ApiError detection - errorText:", errorText);

    if (
      errorText.includes("subscription") ||
      errorText.includes("plan") ||
      errorText.includes("limit") ||
      errorText.includes("quota") ||
      errorText.includes("gói") ||
      errorText.includes("đăng ký") ||
      errorText.includes("không tìm thấy gói")
    ) {
      console.log("✅ Subscription error detected!");
      shouldNavigateToBilling = true;
    } else {
      console.log("❌ Not a subscription error");
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

    console.log("Error detection - errorText:", errorText);
    console.log("Error detection - responseData:", responseData);

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
      console.log("✅ Subscription error detected!");
      shouldNavigateToBilling = true;
    } else {
      console.log("❌ Not a subscription error");
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

  showErrorToast(errorMessage);

  // Navigate to billing if subscription error detected
  if (shouldNavigateToBilling && navigate) {
    console.log("Subscription error detected, navigating to billing page...");
    setTimeout(() => {
      navigate("/billing");
    }, 2000);
  }

  return errorMessage;
};

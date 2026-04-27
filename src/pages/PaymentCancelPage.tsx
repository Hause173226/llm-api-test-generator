import React from "react";
import { useNavigate } from "react-router-dom";
import { XCircle, ArrowLeft } from "lucide-react";

export default function PaymentCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-surface-container rounded-2xl shadow-lg p-8 text-center space-y-6">
        <XCircle className="w-16 h-16 text-yellow-500 mx-auto" />
        <h1 className="text-2xl font-bold text-on-surface">
          Đã hủy thanh toán
        </h1>
        <p className="text-on-surface-variant text-sm">
          Bạn đã hủy quá trình thanh toán PayOS. Không có khoản nào bị trừ. Bạn
          có thể quay lại chọn gói và thử lại bất cứ lúc nào.
        </p>
        <button
          onClick={() => navigate("/billing")}
          className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Xem các gói đăng ký
        </button>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface mx-auto transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Về trang chủ
        </button>
      </div>
    </div>
  );
}

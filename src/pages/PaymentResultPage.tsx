import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import subscriptionService, {
  PaymentIntent,
} from "../services/subscriptionService";

// PaymentIntent status numeric enum (FE-14 contract)
const STATUS_SUCCEEDED = 2;
const STATUS_CANCELED = 3;
const STATUS_EXPIRED = 4;

const isFinalStatus = (status: number) =>
  status === STATUS_SUCCEEDED ||
  status === STATUS_CANCELED ||
  status === STATUS_EXPIRED;

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const status = searchParams.get("status"); // "success" | "failed"
  const intentId = searchParams.get("intentId");

  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [loading, setLoading] = useState(false);
  const [pollingDone, setPollingDone] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 10;
  const POLL_INTERVAL_MS = 2000;

  useEffect(() => {
    if (status === "success" && intentId) {
      setLoading(true);
      pollIntent(intentId);
    }
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollIntent = async (id: string) => {
    try {
      const data = await subscriptionService.getPaymentIntent(id);
      setIntent(data);

      if (isFinalStatus(data.status)) {
        setPollingDone(true);
        setLoading(false);
        return;
      }

      pollCountRef.current += 1;
      if (pollCountRef.current >= MAX_POLLS) {
        setPollingDone(true);
        setLoading(false);
        return;
      }

      pollRef.current = setTimeout(() => pollIntent(id), POLL_INTERVAL_MS);
    } catch {
      setPollingDone(true);
      setLoading(false);
    }
  };

  const isSuccess =
    status === "success" &&
    (intent ? intent.status === STATUS_SUCCEEDED : !pollingDone && loading);

  const isActualSuccess =
    status === "success" && intent?.status === STATUS_SUCCEEDED;
  const isActualFail =
    status === "failed" ||
    (pollingDone &&
      intent &&
      (intent.status === STATUS_CANCELED || intent.status === STATUS_EXPIRED));
  const isPending = status === "success" && loading && !pollingDone;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-surface-container rounded-2xl shadow-lg p-8 text-center space-y-6">
        {isPending && (
          <>
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto" />
            <h1 className="text-2xl font-bold text-on-surface">
              {t("pages.PaymentResultPage.ang_x_c_nh_n_thanh_to_n")}
            </h1>
            <p className="text-on-surface-variant text-sm">
              {t("pages.PaymentResultPage.confirming_desc")}
            </p>
          </>
        )}

        {!isPending && isActualSuccess && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-on-surface">
              {t("pages.PaymentResultPage.thanh_to_n_th_nh_c_ng")}
            </h1>
            <p className="text-on-surface-variant text-sm">
              {t("pages.PaymentResultPage.success_desc")}
            </p>
            <button
              onClick={() => navigate("/billing")}
              className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {t("pages.PaymentResultPage.xem_trang_billing")}
            </button>
          </>
        )}

        {!isPending && isActualFail && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold text-on-surface">
              {t("pages.PaymentResultPage.thanh_to_n_th_t_b_i")}
            </h1>
            <p className="text-on-surface-variant text-sm">
              {t("pages.PaymentResultPage.failure_desc")}
            </p>
            <button
              onClick={() => navigate("/billing")}
              className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {t("pages.PaymentResultPage.quay_l_i_trang_billing")}
            </button>
          </>
        )}

        {/* Fallback: polling timed out but status still unknown */}
        {!isPending && pollingDone && !isActualSuccess && !isActualFail && (
          <>
            <Loader2 className="w-16 h-16 text-yellow-500 mx-auto" />
            <h1 className="text-2xl font-bold text-on-surface">
              {t("pages.PaymentResultPage.ang_x_l")}
            </h1>
            <p className="text-on-surface-variant text-sm">
              {t("pages.PaymentResultPage.processing_desc")}
            </p>
            <button
              onClick={() => navigate("/billing")}
              className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {t("pages.PaymentResultPage.xem_trang_billing")}
            </button>
          </>
        )}

        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface mx-auto transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("pages.PaymentResultPage.v_trang_ch")}
        </button>
      </div>
    </div>
  );
}

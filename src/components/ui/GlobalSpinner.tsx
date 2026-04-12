import React from "react";

interface GlobalSpinnerProps {
    label?: string;
}

/**
 * Full-screen overlay spinner với backdrop blur.
 * Dùng khi đang submit form / gọi API quan trọng.
 */
export default function GlobalSpinner({ label }: GlobalSpinnerProps) {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
            <style>{`
        .gs-loader {
          position: relative;
          width: 120px;
          height: 90px;
          margin: 0 auto;
        }
        .gs-loader:before {
          content: "";
          position: absolute;
          bottom: 30px;
          left: 50px;
          height: 30px;
          width: 30px;
          border-radius: 50%;
          background: #6366f1;
          animation: gs-bounce 0.5s ease-in-out infinite alternate;
        }
        .gs-loader:after {
          content: "";
          position: absolute;
          right: 0;
          top: 0;
          height: 7px;
          width: 45px;
          border-radius: 4px;
          box-shadow: 0 5px 0 rgba(255,255,255,0.6), -35px 50px 0 rgba(255,255,255,0.6), -70px 95px 0 rgba(255,255,255,0.6);
          animation: gs-step 1s ease-in-out infinite;
        }
        @keyframes gs-bounce {
          0%   { transform: scale(1, 0.7); }
          40%  { transform: scale(0.8, 1.2); }
          60%  { transform: scale(1, 1); }
          100% { bottom: 140px; }
        }
        @keyframes gs-step {
          0% {
            box-shadow:
              0 10px 0 rgba(0,0,0,0),
              0 10px 0 rgba(255,255,255,0.6),
              -35px 50px 0 rgba(255,255,255,0.6),
              -70px 90px 0 rgba(255,255,255,0.6);
          }
          100% {
            box-shadow:
              0 10px 0 rgba(255,255,255,0.6),
              -35px 50px 0 rgba(255,255,255,0.6),
              -70px 90px 0 rgba(255,255,255,0.6),
              -70px 90px 0 rgba(0,0,0,0);
          }
        }
      `}</style>
            <div className="gs-loader" />
            {label && (
                <p className="mt-6 text-white font-semibold text-sm tracking-wide">
                    {label}
                </p>
            )}
        </div>
    );
}

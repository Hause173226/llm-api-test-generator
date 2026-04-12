import React from "react";

/**
 * Bounce loader spinner from Uiverse.io by alexruix
 * Dùng trong các modal khi đang submit/loading
 */
export default function BounceLoader() {
    return (
        <>
            <style>{`
        .bounce-loader {
          position: relative;
          width: 120px;
          height: 90px;
          margin: 0 auto;
        }
        .bounce-loader:before {
          content: "";
          position: absolute;
          bottom: 30px;
          left: 50px;
          height: 30px;
          width: 30px;
          border-radius: 50%;
          background: #6366f1;
          animation: bounce-loading-bounce 0.5s ease-in-out infinite alternate;
        }
        .bounce-loader:after {
          content: "";
          position: absolute;
          right: 0;
          top: 0;
          height: 7px;
          width: 45px;
          border-radius: 4px;
          box-shadow: 0 5px 0 #e2e8f0, -35px 50px 0 #e2e8f0, -70px 95px 0 #e2e8f0;
          animation: bounce-loading-step 1s ease-in-out infinite;
        }
        @keyframes bounce-loading-bounce {
          0%   { transform: scale(1, 0.7); }
          40%  { transform: scale(0.8, 1.2); }
          60%  { transform: scale(1, 1); }
          100% { bottom: 140px; }
        }
        @keyframes bounce-loading-step {
          0% {
            box-shadow:
              0 10px 0 rgba(0,0,0,0),
              0 10px 0 #e2e8f0,
              -35px 50px 0 #e2e8f0,
              -70px 90px 0 #e2e8f0;
          }
          100% {
            box-shadow:
              0 10px 0 #e2e8f0,
              -35px 50px 0 #e2e8f0,
              -70px 90px 0 #e2e8f0,
              -70px 90px 0 rgba(0,0,0,0);
          }
        }
        .dark .bounce-loader:after {
          box-shadow: 0 5px 0 #334155, -35px 50px 0 #334155, -70px 95px 0 #334155;
        }
        .dark .bounce-loader-step-dark {
          box-shadow:
            0 10px 0 rgba(0,0,0,0),
            0 10px 0 #334155,
            -35px 50px 0 #334155,
            -70px 90px 0 #334155;
        }
      `}</style>
            <div className="bounce-loader" />
        </>
    );
}

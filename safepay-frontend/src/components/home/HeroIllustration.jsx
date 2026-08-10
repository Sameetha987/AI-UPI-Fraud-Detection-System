export default function HeroIllustration() {
  return (
    <div className="relative mx-auto h-[500px] w-full max-w-[560px]">

      {/* Main glow */}
      <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[100px]" />

      {/* Radar rings */}
      <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10" />

      <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10" />

      <div className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10" />

      {/* Connecting lines */}
      <div className="absolute left-1/2 top-1/2 h-[380px] w-px -translate-x-1/2 -translate-y-1/2 rotate-45 bg-cyan-400/10" />

      <div className="absolute left-1/2 top-1/2 h-[380px] w-px -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-cyan-400/10" />

      {/* Central AI Security Card */}
      <div className="absolute left-1/2 top-1/2 flex h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[28px] border border-cyan-400/20 bg-[#071426]/90 shadow-[0_0_60px_rgba(6,182,212,0.08)] backdrop-blur-xl">

        {/* Shield */}
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400">
          <svg
            viewBox="0 0 24 24"
            className="h-10 w-10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" />
            <path d="M8.5 12l2.2 2.2 4.8-5" />
          </svg>
        </div>

        <h3 className="text-lg font-bold tracking-wide text-white">
          AI SECURITY
        </h3>

        <p className="mt-1 text-sm text-slate-400">
          Fraud Detection Engine
        </p>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
          Real-time monitoring
        </div>
      </div>

      {/* UPI node */}
      <div className="absolute left-[12%] top-[12%] flex h-16 w-16 flex-col items-center justify-center rounded-2xl border border-slate-700/60 bg-[#0b1629]/90 text-cyan-400 shadow-xl backdrop-blur">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
          <path d="M14 14h3v3h-3zM18 18h2v2h-2zM18 14h2" />
        </svg>

        <span className="mt-1 text-[9px] text-slate-500">
          UPI
        </span>
      </div>

      {/* Device node */}
      <div className="absolute right-[7%] top-[25%] flex h-16 w-16 flex-col items-center justify-center rounded-2xl border border-slate-700/60 bg-[#0b1629]/90 text-blue-400 shadow-xl backdrop-blur">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <rect x="7" y="3" width="10" height="18" rx="2" />
          <circle cx="12" cy="18" r="0.8" fill="currentColor" />
        </svg>

        <span className="mt-1 text-[9px] text-slate-500">
          Device
        </span>
      </div>

      {/* Payment node */}
      <div className="absolute bottom-[18%] left-[12%] flex h-16 w-16 flex-col items-center justify-center rounded-2xl border border-slate-700/60 bg-[#0b1629]/90 text-cyan-400 shadow-xl backdrop-blur">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
        </svg>

        <span className="mt-1 text-[9px] text-slate-500">
          Payment
        </span>
      </div>

      {/* AI analysis node */}
      <div className="absolute bottom-[12%] right-[10%] flex h-16 w-16 flex-col items-center justify-center rounded-2xl border border-slate-700/60 bg-[#0b1629]/90 text-emerald-400 shadow-xl backdrop-blur">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 3v18M5 8h14M5 16h14" />
          <circle cx="12" cy="12" r="7" />
        </svg>

        <span className="mt-1 text-[9px] text-slate-500">
          AI
        </span>
      </div>
    </div>
  );
}
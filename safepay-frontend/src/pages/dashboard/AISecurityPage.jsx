import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  BrainCircuit,
  Activity,
  Search,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  TrendingUp,
  LockKeyhole,
  RotateCcw,
  Info,
  Smartphone,
  MapPin,
  CircleDollarSign,
} from "lucide-react";

const initialTransactions = [];

const initialForm = {
  amount: "45000",
  type: "TRANSFER",
  frequency: "8",
  newBeneficiary: true,
  unusualAmount: true,
  transactionHour: "23",
  deviceChanged: true,
  failedAttempts: "1",
  locationMismatch: false,
  balanceImpact: "MEDIUM",
};

function getRiskAssessment(form) {
  // Transparent, configurable rule-based risk scoring.
  // This function does not call the trained XGBoost model.
  let score = 5;
  const indicators = [];

  const amount = Number(form.amount);
  const frequency = Number(form.frequency);
  const failedAttempts = Number(form.failedAttempts);
  const hour = Number(form.transactionHour);

  if (amount >= 50000) {
    score += 20;
    indicators.push("High transaction amount (₹50,000 or above)");
  } else if (amount >= 20000) {
    score += 15;
    indicators.push("Elevated transaction amount (₹20,000 or above)");
  } else if (amount >= 10000) {
    score += 8;
    indicators.push("Moderate transaction amount (₹10,000 or above)");
  }

  if (form.type === "TRANSFER" || form.type === "CASH_OUT") {
    score += 5;
    indicators.push(`Transaction type selected: ${form.type}`);
  }

  if (frequency >= 10) {
    score += 18;
    indicators.push("High recent transaction frequency (10 or more)");
  } else if (frequency >= 5) {
    score += 10;
    indicators.push("Elevated recent transaction frequency (5 or more)");
  }

  if (form.newBeneficiary) {
    score += 12;
    indicators.push("Recipient is marked as a new beneficiary");
  }

  if (form.unusualAmount) {
    score += 15;
    indicators.push("Amount is marked as unusual for this user");
  }

  if (hour >= 0 && hour <= 5) {
    score += 10;
    indicators.push("Transaction falls within the configured late-night window (00:00–05:59)");
  }

  if (form.deviceChanged) {
    score += 10;
    indicators.push("Device change is reported");
  }

  if (failedAttempts >= 3) {
    score += 15;
    indicators.push("Multiple recent failed attempts (3 or more)");
  } else if (failedAttempts >= 1) {
    score += 7;
    indicators.push("At least one recent failed attempt");
  }

  if (form.locationMismatch) {
    score += 10;
    indicators.push("Location mismatch is reported");
  }

  if (form.balanceImpact === "HIGH") {
    score += 15;
    indicators.push("Transfer represents a high share of available balance");
  } else if (form.balanceImpact === "MEDIUM") {
    score += 7;
    indicators.push("Transfer represents a moderate share of available balance");
  }

  score = Math.min(score, 99);

  const riskLevel = score >= 70 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";
  const action = riskLevel === "LOW" ? "STANDARD_CHECK" : "REVIEW";

  if (indicators.length === 0) {
    indicators.push("No configured risk signals were triggered");
  }

  return { score, riskLevel, action, indicators };
}

function StatCard({ icon: Icon, label, value, subtitle, iconColor }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <h3 className="mt-3 text-3xl font-bold text-white">{value}</h3>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className="rounded-xl bg-white/5 p-3">
          <Icon size={22} className={iconColor} />
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ level }) {
  const styles = {
    LOW: "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
    MEDIUM: "border-amber-400/20 bg-amber-400/10 text-amber-400",
    HIGH: "border-red-400/20 bg-red-400/10 text-red-400",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[level]}`}
    >
      {level}
    </span>
  );
}

function ScoreRing({ score, level }) {
  const color =
    level === "HIGH"
      ? "#f87171"
      : level === "MEDIUM"
        ? "#fbbf24"
        : "#34d399";

  return (
    <div
      className="relative flex h-36 w-36 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${score * 3.6}deg, #1e293b 0deg)`,
      }}
    >
      <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-slate-950">
        <span className="text-4xl font-bold text-white">{score}</span>
        <span className="mt-1 text-xs text-slate-400">out of 100</span>
      </div>
    </div>
  );
}

export default function AISecurityPage() {
  const [form, setForm] = useState(initialForm);
  const [assessment, setAssessment] = useState(null);
  const [history, setHistory] = useState(initialTransactions);
  const [error, setError] = useState("");

  const analyzedCount = history.length;
  const highRiskCount = history.filter(
    (item) => item.riskLevel === "HIGH"
  ).length;

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setAssessment(null);
  }

  function handleAnalyze(event) {
    event.preventDefault();
    setError("");

    const amount = Number(form.amount);
    const frequency = Number(form.frequency);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a transaction amount greater than zero.");
      return;
    }

    if (
      form.frequency.trim() === "" ||
      !Number.isInteger(frequency) ||
      frequency < 1 ||
      frequency > 100
    ) {
      setError("Enter a transaction frequency between 1 and 100.");
      return;
    }

    const failedAttempts = Number(form.failedAttempts);
    if (
      form.failedAttempts.trim() === "" ||
      !Number.isInteger(failedAttempts) ||
      failedAttempts < 0 ||
      failedAttempts > 20
    ) {
      setError("Enter failed attempts as a whole number from 0 to 20.");
      return;
    }

    const hour = Number(form.transactionHour);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      setError("Select a valid transaction hour.");
      return;
    }

    const result = getRiskAssessment(form);

    const newAssessment = {
      id: `RISK-${Date.now().toString().slice(-8)}`,
      amount,
      type: form.type,
      frequency,
      newBeneficiary: form.newBeneficiary,
      unusualAmount: form.unusualAmount,
      riskScore: result.score,
      riskLevel: result.riskLevel,
      action: result.action,
      indicators: result.indicators,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setAssessment(newAssessment);
    setHistory((previous) => [newAssessment, ...previous].slice(0, 8));
  }

  function resetAnalyzer() {
    setForm(initialForm);
    setAssessment(null);
    setError("");
  }

  return (
    <div className="min-h-screen space-y-7 bg-slate-950 p-4 text-white sm:p-6 lg:p-8">
      {/* Header */}
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-cyan-400/10 p-2">
              <BrainCircuit className="text-cyan-400" size={24} />
            </div>

            <span className="text-sm font-medium text-cyan-400">
              SAFEPAY INTELLIGENCE
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            AI Security Center
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Assess transaction risk using ten transaction and context signals.

          </p>
        </div>


      </section>



      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Assessments"
          value={analyzedCount}
          subtitle="Assessments created in this session"
          iconColor="text-cyan-400"
        />

        <StatCard
          icon={ShieldAlert}
          label="High-Risk Results"
          value={highRiskCount}
          subtitle="Based on configured risk rules"
          iconColor="text-red-400"
        />

        <StatCard
          icon={ShieldCheck}
          label="Risk Analyzer"
          value="Ready"
          subtitle="Rule-based assessment active"
          iconColor="text-emerald-400"
        />

        <StatCard
          icon={LockKeyhole}
          label="Payment Protection"
          value="Advisory"
          subtitle="Does not approve or block payments"
          iconColor="text-violet-400"
        />
      </section>

      {/* Analyzer and results */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Form */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-7 xl:col-span-3">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-cyan-400/10 p-3">
              <Search className="text-cyan-400" size={22} />
            </div>

            <div>
              <h2 className="text-xl font-semibold">
                Transaction Risk Analyzer
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Enter the transaction and context details to assess risk.
              </p>
            </div>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-5">
            <div>
              <label
                htmlFor="amount"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Transaction Amount (INR)
              </label>

              <div className="flex items-center rounded-xl border border-white/10 bg-slate-950 px-4 focus-within:border-cyan-400/60">
                <span className="mr-3 text-slate-400">₹</span>
                <input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(event) =>
                    updateField("amount", event.target.value)
                  }
                  className="w-full bg-transparent py-3 text-white outline-none"
                  placeholder="Enter amount"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="type"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Transaction Type
                </label>

                <select
                  id="type"
                  value={form.type}
                  onChange={(event) =>
                    updateField("type", event.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/60"
                >
                  <option value="PAYMENT">Payment</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="CASH_OUT">Cash Out</option>
                  <option value="CASH_IN">Cash In</option>
                  <option value="DEBIT">Debit</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="frequency"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Recent Transaction Frequency
                </label>

                <input
                  id="frequency"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  required
                  value={form.frequency}
                  onChange={(event) =>
                    updateField("frequency", event.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <div>
                  <p className="text-sm font-medium text-white">New Beneficiary</p>
                  <p className="mt-1 text-xs text-slate-400">Is this a newly added recipient?</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.newBeneficiary}
                  onChange={(event) => updateField("newBeneficiary", event.target.checked)}
                  className="h-5 w-5 accent-cyan-400"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <div>
                  <p className="text-sm font-medium text-white">Unusual Amount</p>
                  <p className="mt-1 text-xs text-slate-400">Is this unusual for the user?</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.unusualAmount}
                  onChange={(event) => updateField("unusualAmount", event.target.checked)}
                  className="h-5 w-5 accent-cyan-400"
                />
              </label>

              <div>
                <label htmlFor="transactionHour" className="mb-2 block text-sm font-medium text-slate-300">
                  Transaction Hour (24-hour format)
                </label>
                <select
                  id="transactionHour"
                  value={form.transactionHour}
                  onChange={(event) => updateField("transactionHour", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/60"
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <option key={hour} value={String(hour)}>
                      {String(hour).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="failedAttempts" className="mb-2 block text-sm font-medium text-slate-300">
                  Recent Failed Attempts
                </label>
                <input
                  id="failedAttempts"
                  type="number"
                  min="0"
                  max="20"
                  step="1"
                  required
                  value={form.failedAttempts}
                  onChange={(event) => updateField("failedAttempts", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label htmlFor="balanceImpact" className="mb-2 block text-sm font-medium text-slate-300">
                  Impact on Available Balance
                </label>
                <select
                  id="balanceImpact"
                  value={form.balanceImpact}
                  onChange={(event) => updateField("balanceImpact", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/60"
                >
                  <option value="LOW">Low share of balance</option>
                  <option value="MEDIUM">Moderate share of balance</option>
                  <option value="HIGH">High share of balance</option>
                </select>
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-start gap-3">
                  <Smartphone className="mt-0.5 text-cyan-400" size={18} />
                  <div>
                    <p className="text-sm font-medium text-white">Device Changed</p>
                    <p className="mt-1 text-xs text-slate-400">Is this a new or unrecognized device?</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.deviceChanged}
                  onChange={(event) => updateField("deviceChanged", event.target.checked)}
                  className="h-5 w-5 accent-cyan-400"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 text-cyan-400" size={18} />
                  <div>
                    <p className="text-sm font-medium text-white">Location Mismatch</p>
                    <p className="mt-1 text-xs text-slate-400">Does the transaction location differ from usual?</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.locationMismatch}
                  onChange={(event) => updateField("locationMismatch", event.target.checked)}
                  className="h-5 w-5 accent-cyan-400"
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3.5 font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                <Zap size={18} />
                Analyze Transaction
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={resetAnalyzer}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3.5 text-sm font-medium text-slate-300 transition hover:bg-white/5"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Result */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-7 xl:col-span-2">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Risk Assessment</h2>
              <p className="mt-1 text-sm text-slate-400">
                {assessment ? assessment.id : "Awaiting analysis"}
              </p>
            </div>

            <BrainCircuit size={25} className="text-cyan-400" />
          </div>

          {assessment ? (
            <div className="space-y-5">
              <div className="flex flex-col items-center rounded-xl border border-white/5 bg-slate-950/60 p-5">
                <ScoreRing
                  score={assessment.riskScore}
                  level={assessment.riskLevel}
                />

                <div className="mt-4">
                  <RiskBadge level={assessment.riskLevel} />
                </div>

              </div>

              <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Suggested action
                </p>

                <div className="mt-3 flex items-center gap-3">
                  {assessment.action === "STANDARD_CHECK" ? (
                    <CheckCircle2
                      className="shrink-0 text-emerald-400"
                      size={23}
                    />
                  ) : (
                    <AlertTriangle
                      className="shrink-0 text-amber-400"
                      size={23}
                    />
                  )}

                  <div>
                    <p className="font-semibold text-white">
                      {assessment.action === "STANDARD_CHECK"
                        ? "Low risk — Standard checks"
                        : "Elevated risk — Admin review"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Recommendation only; no payment is approved or blocked.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-slate-200">
                  Risk indicators
                </p>

                <div className="space-y-2">
                  {assessment.indicators.map((indicator) => (
                    <div
                      key={indicator}
                      className="flex items-start gap-2 text-sm text-slate-400"
                    >
                      <AlertTriangle
                        size={15}
                        className="mt-0.5 shrink-0 text-amber-400"
                      />
                      {indicator}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-center">
              <div className="rounded-full bg-cyan-400/10 p-5">
                <ShieldCheck size={42} className="text-cyan-400" />
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Ready to Analyze
              </h3>

              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                Enter transaction details and select Analyze Transaction to
                view the risk score, triggered indicators, and suggested action.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Recent assessments */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
        <div className="flex flex-col justify-between gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h2 className="text-xl font-semibold">Recent Risk Assessments</h2>
            <p className="mt-1 text-sm text-slate-400">
              Assessment records created during this session.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock size={15} />
            Latest first
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Reference</th>
                <th className="px-6 py-4 font-medium">Transaction</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Risk Score</th>
                <th className="px-6 py-4 font-medium">Risk Level</th>
                <th className="px-6 py-4 font-medium">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {history.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="transition hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">
                      {transaction.id}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {transaction.time}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-300">
                    {transaction.type}
                  </td>

                  <td className="px-6 py-4 text-sm font-medium text-white">
                    ₹{Number(transaction.amount).toLocaleString("en-IN")}
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-semibold text-white">
                      {transaction.riskScore}/100
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <RiskBadge level={transaction.riskLevel} />
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={
                        transaction.action === "STANDARD_CHECK"
                          ? "text-sm font-medium text-emerald-400"
                          : "text-sm font-medium text-amber-400"
                      }
                    >
                      {transaction.action === "STANDARD_CHECK" ? "STANDARD CHECK" : transaction.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


      </section>


     
    </div>
  );
}
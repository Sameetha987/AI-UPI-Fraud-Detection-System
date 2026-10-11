import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Copy,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";

function formatCurrency(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount ?? 0));
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function maskAccountNumber(accountNumber) {
  if (!accountNumber) return "Not available";

  const value = String(accountNumber);

  return `•••• •••• ${value.slice(-4)}`;
}

function getStatusClasses(status) {
  switch (String(status || "").toUpperCase()) {
    case "ACTIVE":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

    case "BLOCKED":
    case "CLOSED":
      return "border-red-400/20 bg-red-400/10 text-red-300";

    default:
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }
}

function AccountPage() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAccount() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/accounts/me");
      setAccount(response.data);
    } catch (err) {
      const status = err.response?.status;

      if (status === 401 || status === 403) {
        setError("Your session may have expired. Please log in again.");
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to load your account details. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccount();
  }, []);

  async function copyAccountNumber() {
    if (!account?.accountNumber) {
      toast.error("Account number is unavailable.");
      return;
    }

    try {
      await navigator.clipboard.writeText(account.accountNumber);
      toast.success("Account number copied.");
    } catch {
      toast.error(
        "Unable to copy. Your browser may require a secure connection.",
      );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw size={20} className="animate-spin text-cyan-300" />
          Loading your account...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-red-400/20 bg-slate-900/70 p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-400/10">
          <CircleAlert size={24} className="text-red-300" />
        </div>

        <h1 className="text-2xl font-bold">Unable to load account</h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">{error}</p>

        <button
          onClick={loadAccount}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          <RefreshCw size={17} />
          Try again
        </button>
      </section>
    );
  }

  if (!account) return null;

  const user = JSON.parse(localStorage.getItem("safepay_user") || "{}");

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-cyan-300">
            <Wallet size={17} />
            Account management
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            My Account
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
            View your SafePay account details and available balance.
          </p>
        </div>

        <button
          onClick={loadAccount}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 sm:self-auto"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-6 -top-10 h-44 w-44 rounded-full border border-white/10" />

          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/15 p-3">
                  <ShieldCheck size={25} />
                </div>

                <div>
                  <p className="font-bold">SafePay AI</p>
                  <p className="text-xs text-blue-100">
                    Digital payment account
                  </p>
                </div>
              </div>

              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
                {account.currency || "INR"}
              </span>
            </div>

            <p className="mt-10 text-sm text-blue-100">Available balance</p>

            <p className="mt-2 break-words text-3xl font-bold sm:text-4xl">
              {formatCurrency(account.balance, account.currency || "INR")}
            </p>

            <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs text-blue-100">Account number</p>

                <p className="mt-2 font-mono text-lg tracking-wider">
                  {maskAccountNumber(account.accountNumber)}
                </p>
              </div>

              <button
                onClick={copyAccountNumber}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/20"
              >
                <Copy size={15} />
                Copy number
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10">
            <Wallet size={24} className="text-cyan-300" />
          </div>

          <h2 className="text-lg font-semibold">Account information</h2>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-xs text-slate-500">Account holder</p>
              <p className="mt-1 break-words font-medium">
                {user.fullName || "SafePay User"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Account ID</p>
              <p className="mt-1 font-medium">
                {account.id ?? "Not available"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Account status</p>
              <span
                className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(account.status)}`}
              >
                {account.status || "UNKNOWN"}
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-500">Account created</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                <CalendarDays size={16} className="text-slate-400" />
                {formatDate(account.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Link
          to="/transfer"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-5 transition hover:border-cyan-400/30 hover:bg-slate-900"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
              <ArrowUpRight size={22} />
            </div>

            <div>
              <h2 className="font-semibold">Transfer Money</h2>
              <p className="mt-1 text-sm text-slate-400">
                Send money to a registered SafePay user.
              </p>
            </div>
          </div>

          <ArrowRight
            size={19}
            className="shrink-0 text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-300"
          />
        </Link>

        <Link
          to="/transactions"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-5 transition hover:border-cyan-400/30 hover:bg-slate-900"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-400/10 p-3 text-blue-300">
              <ArrowDownLeft size={22} />
            </div>

            <div>
              <h2 className="font-semibold">Transaction History</h2>
              <p className="mt-1 text-sm text-slate-400">
                Review your previous transfers and payments.
              </p>
            </div>
          </div>

          <ArrowRight
            size={19}
            className="shrink-0 text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-300"
          />
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-cyan-300" />

          <div>
            <h2 className="font-semibold">Your account at a glance</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              These details are retrieved from your authenticated SafePay
              account. Your account balance and status are provided by the
              backend.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AccountPage;
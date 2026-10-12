import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  RefreshCw,
  Clock3,
  ShieldCheck,
  Copy,
  Send,
  ReceiptText,
  CircleCheck,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";

function formatMoney(amount, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount ?? 0));
  } catch {
    return `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;
  }
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }) {
  const styles = {
    SUCCESS: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
    PENDING: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
    FAILED: "bg-rose-400/10 text-rose-300 ring-rose-400/20",
    CANCELLED: "bg-pink-400/10 text-pink-300 ring-pink-400/20",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
        styles[status] || "bg-white/5 text-slate-300 ring-white/10"
      }`}
    >
      {status || "UNKNOWN"}
    </span>
  );
}

function DashboardPage() {
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [balanceVisible, setBalanceVisible] = useState(true);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("safepay_user") || "{}");
    } catch {
      return {};
    }
  })();

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        api.get("/api/accounts/me"),
        api.get("/api/transactions", {
          params: { page: 0, size: 5 },
        }),
        api.get("/api/users/me"),
      ]);

      const accountResult = results[0];
      const transactionsResult = results[1];
      const profileResult = results[2];

      if (accountResult.status === "fulfilled") {
        setAccount(accountResult.value.data);
      }

      if (transactionsResult.status === "fulfilled") {
        const data = transactionsResult.value.data;
        setTransactions(
          Array.isArray(data?.content) ? data.content : [],
        );
      }

      if (profileResult.status === "fulfilled") {
        const profile = profileResult.value.data;

        let storedUser = {};

        try {
          storedUser = JSON.parse(
            localStorage.getItem("safepay_user") || "{}",
          );
        } catch {
          storedUser = {};
        }

        localStorage.setItem(
          "safepay_user",
          JSON.stringify({
            ...storedUser,
            ...profile,
          }),
        );
      }

      if (results.every((result) => result.status === "rejected")) {
        setError(
          "We couldn't load your account right now. Please try again.",
        );
      } else if (
        results.some((result) => result.status === "rejected")
      ) {
        toast.error(
          "Some dashboard information could not be refreshed.",
        );
      }
    } catch {
      setError(
        "We couldn't load your account right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const accountNumber = account?.accountNumber;

  async function copyAccountNumber() {
    if (!accountNumber) {
      toast.error("Account number is unavailable.");
      return;
    }

    try {
      await navigator.clipboard.writeText(accountNumber);
      toast.success("Account number copied!");
    } catch {
      toast.error("Unable to copy the account number.");
    }
  }

  const successfulCount = transactions.filter(
    (transaction) => transaction.status === "SUCCESS",
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-8">
      {/* Welcome section */}
      <motion.header
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"
      >
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-pink-400/25 bg-gradient-to-r from-cyan-400/10 via-blue-400/10 to-pink-400/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-cyan-200 shadow-lg shadow-cyan-950/20">
            <Sparkles size={14} className="text-pink-300" />
            YOUR SAFE FINANCIAL SPACE
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 bg-clip-text text-transparent">
              {user.fullName?.split(" ")[0] || "there"}
            </span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
            Your money, your transactions, your control. Here's your
            latest account overview.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-cyan-400/20 bg-gradient-to-r from-slate-900 to-blue-950/60 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200 disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </motion.button>
      </motion.header>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-rose-400/20 bg-gradient-to-r from-rose-500/10 to-orange-400/5 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-rose-200">{error}</p>

          <button
            onClick={loadDashboard}
            className="rounded-lg border border-rose-400/20 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-400/10"
          >
            Try again
          </button>
        </motion.div>
      )}

      {/* Main balance card */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.08 }}
        className="relative isolate overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-blue-950 via-slate-900 to-violet-950 p-6 shadow-2xl shadow-blue-950/30 sm:p-9"
      >
        {/* Decorative gradient lighting */}
        <div className="pointer-events-none absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-32 left-1/3 -z-10 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="pointer-events-none absolute left-1/4 top-0 -z-10 h-40 w-40 rounded-full bg-pink-400/10 blur-3xl" />

        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-300">
              <span className="rounded-xl border border-cyan-300/15 bg-cyan-400/10 p-2.5">
                <Wallet size={21} className="text-cyan-300" />
              </span>
              Available balance
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <motion.p
                key={`${balanceVisible}-${account?.balance}`}
                initial={{ opacity: 0.5, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="break-all text-4xl font-bold tracking-tight text-white sm:text-5xl"
              >
                {loading && !account
                  ? "Loading..."
                  : !account
                    ? "Unavailable"
                    : balanceVisible
                      ? formatMoney(
                          account.balance,
                          account.currency,
                        )
                      : "••••••••"}
              </motion.p>

              {account && (
                <button
                  onClick={() =>
                    setBalanceVisible((visible) => !visible)
                  }
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-violet-400/30 hover:bg-violet-400/10 hover:text-violet-200"
                  aria-label={
                    balanceVisible ? "Hide balance" : "Show balance"
                  }
                >
                  {balanceVisible ? "Hide balance" : "Show balance"}
                </button>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  account?.status === "ACTIVE"
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : "border-amber-400/20 bg-amber-400/10 text-amber-300"
                }`}
              >
                <CircleCheck size={14} />
                {account?.status || "Account status unavailable"}
              </span>

              <span className="text-xs text-slate-500">
                {account?.currency || "INR"} account
              </span>
            </div>
          </div>

          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative hidden h-28 w-36 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/15 bg-gradient-to-br from-cyan-400/10 via-blue-400/5 to-violet-400/10 sm:flex"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-pink-400/10" />

            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-cyan-400/15 blur-xl" />
              <ShieldCheck
                size={64}
                strokeWidth={1.2}
                className="relative text-cyan-300/90"
              />
            </div>
          </motion.div>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-5 border-t border-white/10 pt-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Account number
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="font-mono text-lg tracking-widest text-white sm:text-xl">
                {accountNumber
                  ? `•••• •••• ${accountNumber.slice(-4)}`
                  : "Unavailable"}
              </p>

              {accountNumber && (
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={copyAccountNumber}
                  aria-label="Copy account number"
                  className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-2 text-cyan-300 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
                >
                  <Copy size={15} />
                </motion.button>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Your balance is retrieved from SafePay.
          </p>
        </div>
      </motion.section>

      {/* Quick actions */}
      <section className="grid gap-4 sm:grid-cols-2">
        <motion.div
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.2 }}
        >
          <Link
            to="/transfer"
            className="group relative flex h-full items-center justify-between gap-4 overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-blue-600/20 via-cyan-500/10 to-violet-500/10 p-5 transition duration-300 hover:border-cyan-300/50 hover:shadow-xl hover:shadow-cyan-950/20 sm:p-6"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl transition group-hover:bg-cyan-400/20" />

            <div className="relative flex items-center gap-4">
              <span className="rounded-xl border border-cyan-300/10 bg-cyan-400/10 p-3 text-cyan-300 transition group-hover:bg-cyan-400/15">
                <Send size={23} />
              </span>

              <div>
                <h2 className="font-semibold text-white">
                  Transfer money
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Send money to a SafePay user
                </p>
              </div>
            </div>

            <ArrowRight className="relative shrink-0 text-cyan-300 transition duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.2 }}
        >
          <Link
            to="/transactions"
            className="group relative flex h-full items-center justify-between gap-4 overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 via-pink-500/5 to-blue-500/10 p-5 transition duration-300 hover:border-pink-300/40 hover:shadow-xl hover:shadow-violet-950/20 sm:p-6"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-pink-400/10 blur-2xl transition group-hover:bg-pink-400/20" />

            <div className="relative flex items-center gap-4">
              <span className="rounded-xl border border-violet-300/10 bg-violet-400/10 p-3 text-violet-300 transition group-hover:bg-pink-400/10 group-hover:text-pink-300">
                <ReceiptText size={23} />
              </span>

              <div>
                <h2 className="font-semibold text-white">
                  Transaction history
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Search payments and view receipts
                </p>
              </div>
            </div>

            <ArrowRight className="relative shrink-0 text-violet-300 transition duration-300 group-hover:translate-x-1 group-hover:text-pink-300" />
          </Link>
        </motion.div>
      </section>

      {/* Account overview */}
      <section className="grid gap-4 sm:grid-cols-3">
        {/* Currency card */}
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.06] to-slate-900/60 p-5 transition duration-300 hover:border-cyan-400/30"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
              <Wallet size={21} />
            </span>

            <p className="text-sm text-slate-400">Account currency</p>
          </div>

          <p className="mt-5 text-2xl font-bold text-white">
            {account?.currency || "—"}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Your registered account currency
          </p>
        </motion.article>

        {/* Successful payments card */}
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.06] to-slate-900/60 p-5 transition duration-300 hover:border-emerald-400/30"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-emerald-400/10 p-3 text-emerald-300">
              <CircleCheck size={21} />
            </span>

            <p className="text-sm text-slate-400">
              Successful recent payments
            </p>
          </div>

          <p className="mt-5 text-2xl font-bold text-white">
            {loading ? "—" : successfulCount}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Among the latest {transactions.length} transactions loaded
          </p>
        </motion.article>

        {/* Account security card */}
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.19 }}
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-orange-400/15 bg-gradient-to-br from-orange-400/[0.06] to-slate-900/60 p-5 transition duration-300 hover:border-orange-400/30"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-orange-400/10 p-3 text-orange-300">
              <ShieldCheck size={21} />
            </span>

            <p className="text-sm text-slate-400">Account security</p>
          </div>

          <p className="mt-5 text-lg font-bold text-white">
            {account?.status === "ACTIVE"
              ? "Account active"
              : "Check account"}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Based on your account status
          </p>
        </motion.article>
      </section>

      {/* Recent transactions */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="overflow-hidden rounded-3xl border border-violet-400/15 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-violet-950/20"
      >
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:p-7">
          <div>
            <div className="flex items-center gap-2">
              <Clock3 size={20} className="text-cyan-300" />

              <h2 className="text-xl font-bold text-white">
                Recent transactions
              </h2>
            </div>

            <p className="mt-2 text-sm text-slate-400">
              Your latest recorded account activity.
            </p>
          </div>

          <Link
            to="/transactions"
            className="inline-flex items-center gap-2 text-sm font-semibold text-violet-300 transition hover:text-pink-300"
          >
            View all transactions
            <ArrowRight size={16} />
          </Link>
        </div>

        {loading && transactions.length === 0 ? (
          <div className="space-y-4 p-6">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-xl bg-gradient-to-r from-cyan-400/[0.04] via-violet-400/[0.06] to-pink-400/[0.04]"
              />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <motion.span
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/15 bg-gradient-to-br from-cyan-400/10 to-violet-400/10 text-cyan-300"
            >
              <ReceiptText size={26} />
            </motion.span>

            <h3 className="mt-4 font-semibold text-white">
              Your journey starts here
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
              Your recorded transactions will appear here when available.
            </p>

            <Link
              to="/transfer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
            >
              Make a transfer
              <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {transactions.map((transaction, index) => {
              const direction = (() => {
                if (
                  accountNumber &&
                  transaction.receiverAccountNumber === accountNumber
                ) {
                  return "received";
                }

                if (
                  accountNumber &&
                  transaction.senderAccountNumber === accountNumber
                ) {
                  return "sent";
                }

                return "unknown";
              })();

              return (
                <motion.div
                  key={
                    transaction.id ?? transaction.transactionReference
                  }
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: index * 0.04,
                  }}
                  className="flex flex-col justify-between gap-4 p-5 transition hover:bg-gradient-to-r hover:from-cyan-400/[0.025] hover:via-violet-400/[0.025] hover:to-pink-400/[0.025] sm:flex-row sm:items-center sm:px-7"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                        direction === "received"
                          ? "border-emerald-400/15 bg-emerald-400/10 text-emerald-300"
                          : direction === "sent"
                            ? "border-pink-400/15 bg-pink-400/10 text-pink-300"
                            : "border-violet-400/15 bg-violet-400/10 text-violet-300"
                      }`}
                    >
                      {direction === "received" ? (
                        <ArrowDownLeft size={21} />
                      ) : (
                        <ArrowUpRight size={21} />
                      )}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {transaction.description ||
                          (direction === "received"
                            ? "Money received"
                            : direction === "sent"
                              ? "Money sent"
                              : "Transaction")}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(transaction.createdAt)}
                      </p>

                      <p className="mt-1 truncate font-mono text-xs text-slate-500">
                        {transaction.transactionReference ||
                          "No reference"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="sm:text-right">
                      <p
                        className={`text-base font-bold ${
                          direction === "received"
                            ? "text-emerald-300"
                            : direction === "sent"
                              ? "text-pink-200"
                              : "text-white"
                        }`}
                      >
                        {direction === "received"
                          ? "+"
                          : direction === "sent"
                            ? "−"
                            : ""}
                        {formatMoney(
                          transaction.amount,
                          transaction.currency,
                        )}
                      </p>

                      <div className="mt-2 sm:flex sm:justify-end">
                        <StatusBadge status={transaction.status} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="border-t border-white/10 px-5 py-4 sm:px-7">
          <p className="flex items-center gap-2 text-xs leading-5 text-slate-500">
            <ShieldCheck
              size={15}
              className="shrink-0 text-cyan-400"
            />
            Account and transaction details are loaded from your
            authenticated SafePay session.
          </p>
        </div>
      </motion.section>
    </div>
  );
}

export default DashboardPage;
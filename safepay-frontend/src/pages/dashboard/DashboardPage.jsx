import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  Clock3,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";

function formatMoney(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount ?? 0));
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function DashboardPage() {
  const user = JSON.parse(localStorage.getItem("safepay_user") || "{}");

  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        api.get("/api/accounts/me"),
        api.get("/api/transactions", {
          params: { page: 0, size: 5 },
        }),
      ]);

      const accountResult = results[0];
      const transactionsResult = results[1];

      if (accountResult.status === "fulfilled") {
        setAccount(accountResult.value.data);
      } else {
        setAccount(null);
      }

      if (transactionsResult.status === "fulfilled") {
        const data = transactionsResult.value.data;

        setTransactions(
          Array.isArray(data?.content) ? data.content : []
        );
      } else {
        setTransactions([]);
      }

      if (
        results.every((result) => result.status === "rejected")
      ) {
        setError(
          "Unable to load your account and transactions. Please try again."
        );
      } else if (results.some((result) => result.status === "rejected")) {
        toast.error("Some dashboard information could not be loaded.");
      }
    } catch {
      setError("Unable to load your dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function transactionDirection(transaction) {
    if (
      account?.accountNumber &&
      transaction.receiverAccountNumber === account.accountNumber
    ) {
      return "received";
    }

    if (
      account?.accountNumber &&
      transaction.senderAccountNumber === account.accountNumber
    ) {
      return "sent";
    }

    return "unknown";
  }

  function transactionAmount(transaction) {
    const direction = transactionDirection(transaction);

    if (direction === "received") return "+";
    if (direction === "sent") return "−";

    return "";
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-sm text-cyan-400">
            YOUR FINANCIAL OVERVIEW
          </p>

          <h1 className="text-3xl font-bold sm:text-4xl">
            Welcome, {user.fullName?.split(" ")[0] || "there"}
          </h1>

          <p className="mt-2 text-slate-400">
            Here's what's happening with your SafePay account.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5 disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-red-300"
        >
          {error}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-blue-900 via-slate-900 to-slate-900 p-7 sm:p-9">
          <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-3 text-slate-300">
              <Wallet size={21} />
              <span className="text-sm">Available balance</span>
            </div>

            <p className="mt-6 break-words text-4xl font-bold sm:text-5xl">
              {loading && !account
                ? "Loading..."
                : account
                  ? formatMoney(account.balance, account.currency)
                  : "Unavailable"}
            </p>

            <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Account number
                </p>

                <p className="mt-2 font-mono text-lg tracking-wider">
                  {account?.accountNumber || "Unavailable"}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  account?.status === "ACTIVE"
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "bg-white/10 text-slate-300"
                }`}
              >
                {account?.status || "Status unavailable"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-7">
          <h2 className="text-lg font-semibold">Quick actions</h2>

          <p className="mt-1 text-sm text-slate-400">
            Manage your money with SafePay.
          </p>

          <div className="mt-6 space-y-3">
            <Link
              to="/transfer"
              className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 p-4 font-semibold transition hover:brightness-110"
            >
              <span className="flex items-center gap-3">
                <ArrowUpRight size={20} />
                Transfer money
              </span>

              <ArrowRight size={18} />
            </Link>

            <Link
              to="/transactions"
              className="flex items-center justify-between rounded-xl border border-white/10 p-4 font-medium text-slate-200 transition hover:bg-white/5"
            >
              <span className="flex items-center gap-3">
                <Clock3 size={20} />
                Transaction history
              </span>

              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-400/10 p-3 text-emerald-300">
              <ShieldCheck size={22} />
            </div>

            <div>
              <h2 className="font-semibold">AI payment security</h2>
              <p className="mt-1 text-sm text-slate-400">
                SafePay fraud detection
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-400">
            SafePay uses a machine-learning model to assess transaction
            risk. End-to-end scoring of real transfers is still being
            integrated and verified.
          </p>

          <Link
            to="/ai-security"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            View AI security <ArrowRight size={16} />
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-400/10 p-3 text-blue-300">
              <Wallet size={22} />
            </div>

            <div>
              <h2 className="font-semibold">Account information</h2>
              <p className="mt-1 text-sm text-slate-400">
                Current account details
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Currency</span>
              <span>{account?.currency || "—"}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Account status</span>
              <span>{account?.status || "—"}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Created</span>
              <span>{formatDate(account?.createdAt)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60">
        <div className="flex flex-col justify-between gap-3 border-b border-white/10 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold">Recent transactions</h2>
            <p className="mt-1 text-sm text-slate-400">
              Your latest recorded account activity.
            </p>
          </div>

          <Link
            to="/transactions"
            className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            View all <ArrowRight size={16} />
          </Link>
        </div>

        {loading && transactions.length === 0 ? (
          <p className="p-8 text-center text-slate-400">
            Loading transactions...
          </p>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center">
            <Clock3 size={32} className="mx-auto text-slate-500" />

            <p className="mt-3 font-medium">No recent transactions</p>

            <p className="mt-1 text-sm text-slate-400">
              Your transactions will appear here when available.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-white/[0.02] text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Transaction</th>
                  <th className="px-6 py-4 font-medium">Reference</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 text-right font-medium">Amount</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {transactions.map((transaction) => {
                  const direction = transactionDirection(transaction);

                  return (
                    <tr
                      key={transaction.id}
                      className="transition hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="rounded-lg bg-white/5 p-2 text-slate-300">
                            {direction === "received" ? (
                              <ArrowDownLeft size={18} />
                            ) : (
                              <ArrowUpRight size={18} />
                            )}
                          </span>

                          <div>
                            <p className="font-medium">
                              {transaction.description ||
                                (direction === "received"
                                  ? "Money received"
                                  : direction === "sent"
                                    ? "Money sent"
                                    : "Transaction")}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {direction === "received"
                                ? "Received"
                                : direction === "sent"
                                  ? "Sent"
                                  : "Transaction"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {transaction.transactionReference}
                      </td>

                      <td className="px-6 py-4 text-slate-400">
                        {formatDate(transaction.createdAt)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            transaction.status === "SUCCESS"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : transaction.status === "FAILED"
                                ? "bg-red-400/10 text-red-300"
                                : "bg-amber-400/10 text-amber-300"
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </td>

                      <td
                        className={`px-6 py-4 text-right font-semibold ${
                          direction === "received"
                            ? "text-emerald-300"
                            : direction === "sent"
                              ? "text-slate-200"
                              : "text-slate-400"
                        }`}
                      >
                        {transactionAmount(transaction)}
                        {formatMoney(
                          transaction.amount,
                          transaction.currency
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
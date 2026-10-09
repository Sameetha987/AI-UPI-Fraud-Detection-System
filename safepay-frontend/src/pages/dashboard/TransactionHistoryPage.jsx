import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";

const PAGE_SIZE = 10;

const STATUSES = ["SUCCESS", "PENDING", "FAILED", "CANCELLED"];

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

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ status }) {
  const styles = {
    SUCCESS: "bg-emerald-400/10 text-emerald-300",
    PENDING: "bg-amber-400/10 text-amber-300",
    FAILED: "bg-red-400/10 text-red-300",
    CANCELLED: "bg-slate-400/10 text-slate-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-white/10 text-slate-300"
      }`}
    >
      {status || "UNKNOWN"}
    </span>
  );
}

function TransactionDetails({ transaction, onClose, accountNumber }) {
  if (!transaction) return null;

  const received =
    transaction.receiverAccountNumber === accountNumber;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-details-title"
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-4 inline-flex rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
              <ReceiptText size={24} />
            </div>

            <h2
              id="transaction-details-title"
              className="text-xl font-bold"
            >
              Transaction details
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Reference: {transaction.transactionReference}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close transaction details"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="my-6 rounded-2xl border border-white/10 bg-slate-950 p-5">
          <p className="text-sm text-slate-400">Transaction amount</p>

          <p className="mt-2 break-words text-3xl font-bold">
            {formatMoney(transaction.amount, transaction.currency)}
          </p>

          <div className="mt-4">
            <StatusBadge status={transaction.status} />
          </div>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Direction</span>
            <span>{received ? "Received" : "Sent"}</span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Sender account</span>
            <span className="break-all text-right">
              {transaction.senderAccountNumber}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Receiver account</span>
            <span className="break-all text-right">
              {transaction.receiverAccountNumber}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Created</span>
            <span className="text-right">
              {formatDate(transaction.createdAt)}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Completed</span>
            <span className="text-right">
              {formatDate(transaction.completedAt)}
            </span>
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-slate-400">Description</p>
            <p className="mt-1 break-words">
              {transaction.description || "No description provided"}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-7 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 font-semibold"
        >
          Close
        </button>
      </section>
    </div>
  );
}

function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [accountNumber, setAccountNumber] = useState("");

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [referenceInput, setReferenceInput] = useState("");
  const [referenceMode, setReferenceMode] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page,
        size: PAGE_SIZE,
      };

      if (status) params.status = status;
      if (type) params.type = type;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const response = await api.get("/api/transactions", { params });
      const data = response.data;

      setTransactions(Array.isArray(data.content) ? data.content : []);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? 0);
    } catch (err) {
      setTransactions([]);
      setTotalPages(0);
      setTotalElements(0);

      const message =
        err.response?.data?.message ||
        "Unable to load transactions. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, status, type, fromDate, toDate]);

  useEffect(() => {
    api
      .get("/api/accounts/me")
      .then((response) => {
        setAccountNumber(response.data.accountNumber || "");
      })
      .catch(() => {
        // Transaction history can still load if account lookup fails.
      });
  }, []);

  useEffect(() => {
    if (!referenceMode) {
      loadTransactions();
    }
  }, [loadTransactions, referenceMode]);

  function applyFilter(event) {
    event.preventDefault();

    if (fromDate && toDate && fromDate > toDate) {
      toast.error("The start date cannot be after the end date.");
      return;
    }

    setReferenceMode(false);
    setSelectedTransaction(null);
    setPage(0);

    // The filters are controlled by state; the effect loads the results.
  }

  function resetFilters() {
    setStatus("");
    setType("");
    setFromDate("");
    setToDate("");
    setReferenceInput("");
    setReferenceMode(false);
    setSelectedTransaction(null);
    setPage(0);
  }

  async function searchByReference(event) {
    event.preventDefault();

    const reference = referenceInput.trim();

    if (!reference) {
      toast.error("Enter a transaction reference.");
      return;
    }

    setLoading(true);
    setError("");
    setReferenceMode(true);
    setSelectedTransaction(null);

    try {
      const response = await api.get(
        `/api/transactions/${encodeURIComponent(reference)}`
      );

      setTransactions([response.data]);
      setTotalPages(1);
      setTotalElements(1);
      setPage(0);
    } catch (err) {
      setTransactions([]);
      setTotalPages(0);
      setTotalElements(0);

      setError(
        err.response?.status === 404
          ? "No transaction was found for that reference."
          : err.response?.data?.message ||
              "Unable to search for this transaction."
      );
    } finally {
      setLoading(false);
    }
  }

  function clearReferenceSearch() {
    setReferenceInput("");
    setReferenceMode(false);
    setSelectedTransaction(null);
    setPage(0);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="mb-2 text-sm font-semibold text-cyan-400">
          ACCOUNT ACTIVITY
        </p>

        <h1 className="text-3xl font-bold sm:text-4xl">
          Transaction History
        </h1>

        <p className="mt-2 text-slate-400">
          Review your payments, filter transactions, and inspect individual records.
        </p>
      </header>

      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 sm:p-7">
        <h2 className="mb-5 font-semibold">Find a transaction</h2>

        <form
          onSubmit={searchByReference}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              value={referenceInput}
              onChange={(event) => setReferenceInput(event.target.value)}
              placeholder="Enter transaction reference"
              maxLength={150}
              className="w-full rounded-xl border border-white/10 bg-slate-950 py-3 pl-11 pr-4 outline-none focus:border-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-semibold disabled:opacity-50"
          >
            Search
          </button>

          {referenceMode && (
            <button
              type="button"
              onClick={clearReferenceSearch}
              className="rounded-xl border border-white/10 px-4 py-3 text-slate-300 hover:bg-white/5"
            >
              Clear search
            </button>
          )}
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 sm:p-7">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Filters</h2>

          <button
            type="button"
            onClick={resetFilters}
            className="text-sm text-cyan-300 hover:text-cyan-200"
          >
            Reset filters
          </button>
        </div>

        <form
          onSubmit={applyFilter}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        >
          <div>
            <label
              htmlFor="transaction-status"
              className="mb-2 block text-sm text-slate-400"
            >
              Status
            </label>

            <select
              id="transaction-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none focus:border-cyan-400"
            >
              <option value="">All statuses</option>

              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="transaction-type"
              className="mb-2 block text-sm text-slate-400"
            >
              Transaction type
            </label>

            <select
              id="transaction-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none focus:border-cyan-400"
            >
              <option value="">Sent and received</option>
              <option value="SENT">Sent</option>
              <option value="RECEIVED">Received</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="from-date"
              className="mb-2 block text-sm text-slate-400"
            >
              From date
            </label>

            <input
              id="from-date"
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label
              htmlFor="to-date"
              className="mb-2 block text-sm text-slate-400"
            >
              To date
            </label>

            <input
              id="to-date"
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => setToDate(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 font-semibold text-cyan-300 hover:bg-cyan-400/20 disabled:opacity-50"
            >
              <Search size={17} />
              Apply filters
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60">
        <div className="flex flex-col justify-between gap-3 border-b border-white/10 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold">
              {referenceMode ? "Search result" : "All transactions"}
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {loading
                ? "Loading transaction records..."
                : `${totalElements} transaction(s) found`}
            </p>
          </div>

          <button
            onClick={() => {
              if (referenceMode) {
                searchByReference({
                  preventDefault() {},
                });
              } else {
                loadTransactions();
              }
            }}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="m-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={25} className="mx-auto animate-spin" />
            <p className="mt-3">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <ReceiptText size={35} className="mx-auto text-slate-500" />

            <p className="mt-4 font-medium">No transactions found</p>

            <p className="mt-2 text-sm text-slate-400">
              Try changing the filters or searching for another reference.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-white/[0.02] text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Transaction</th>
                  <th className="px-6 py-4 font-medium">Reference</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 text-right font-medium">Amount</th>
                  <th className="px-6 py-4 text-right font-medium">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {transactions.map((transaction) => {
                  const received =
                    transaction.receiverAccountNumber === accountNumber;

                  const sent =
                    transaction.senderAccountNumber === accountNumber;

                  return (
                    <tr
                      key={transaction.id}
                      className="transition hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-lg p-2 ${
                              received
                                ? "bg-emerald-400/10 text-emerald-300"
                                : "bg-blue-400/10 text-blue-300"
                            }`}
                          >
                            {received ? (
                              <ArrowDownLeft size={18} />
                            ) : (
                              <ArrowUpRight size={18} />
                            )}
                          </span>

                          <div>
                            <p className="font-medium">
                              {transaction.description ||
                                (received
                                  ? "Money received"
                                  : sent
                                    ? "Money sent"
                                    : "Transaction")}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {received ? "Received" : sent ? "Sent" : "Payment"}
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
                        <StatusBadge status={transaction.status} />
                      </td>

                      <td
                        className={`whitespace-nowrap px-6 py-4 text-right font-semibold ${
                          received
                            ? "text-emerald-300"
                            : "text-slate-200"
                        }`}
                      >
                        {received ? "+" : sent ? "−" : ""}
                        {formatMoney(
                          transaction.amount,
                          transaction.currency
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            setSelectedTransaction(transaction)
                          }
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-400/10"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!referenceMode && totalPages > 0 && (
          <div className="flex flex-col justify-between gap-4 border-t border-white/10 p-5 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-400">
              Page {page + 1} of {totalPages}
            </p>

            <div className="flex gap-3">
              <button
                disabled={page === 0 || loading}
                onClick={() => setPage((current) => current - 1)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={17} />
                Previous
              </button>

              <button
                disabled={page + 1 >= totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        )}
      </section>

      <TransactionDetails
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        accountNumber={accountNumber}
      />
    </div>
  );
}

export default TransactionHistoryPage;
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownLeft, ArrowUpRight, Search, RefreshCw, ChevronLeft,
  ChevronRight, ReceiptText, X, Copy, Printer, CalendarDays,
  ArrowUpRight as OpenIcon, Wallet, CheckCircle2, Clock3, XCircle,
  Ban, SlidersHorizontal, RotateCcw, ExternalLink, ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";

const PAGE_SIZE = 10;
const STATUSES = ["SUCCESS", "PENDING", "FAILED", "CANCELLED"];

const money = (amount, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: currency || "INR",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number(amount ?? 0));

const dateText = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const normalizedStatus = (status) => String(status || "UNKNOWN").toUpperCase();

const statusMeta = (status) => {
  const value = normalizedStatus(status);
  const map = {
    SUCCESS: { label: "Successful", Icon: CheckCircle2, classes: "border-emerald-400/30 bg-emerald-400/15 text-emerald-300", dot: "bg-emerald-400" },
    PENDING: { label: "Pending", Icon: Clock3, classes: "border-amber-400/30 bg-amber-400/15 text-amber-200", dot: "bg-amber-300" },
    FAILED: { label: "Failed", Icon: XCircle, classes: "border-rose-400/30 bg-rose-400/15 text-rose-300", dot: "bg-rose-400" },
    CANCELLED: { label: "Cancelled", Icon: Ban, classes: "border-slate-400/30 bg-slate-400/15 text-slate-200", dot: "bg-slate-300" },
  };
  return map[value] || { label: value === "UNKNOWN" ? "Unknown" : value, Icon: Clock3, classes: "border-sky-400/30 bg-sky-400/15 text-sky-200", dot: "bg-sky-300" };
};

function StatusBadge({ status }) {
  const meta = statusMeta(status);
  const Icon = meta.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${meta.classes}`}>
      <Icon size={13} strokeWidth={2.5} /> {meta.label}
    </span>
  );
}

function getDirection(transaction, accountNumber) {
  if (transaction?.receiverAccountNumber && accountNumber &&
      transaction.receiverAccountNumber === accountNumber) return "received";
  if (transaction?.senderAccountNumber && accountNumber &&
      transaction.senderAccountNumber === accountNumber) return "sent";
  return "other";
}

function safeCopy(value, message) {
  if (!value) {
    toast.error("There is no reference to copy.");
    return;
  }
  if (!navigator.clipboard?.writeText) {
    toast.error("Clipboard access is unavailable. Copy the reference manually.");
    return;
  }
  navigator.clipboard.writeText(String(value))
    .then(() => toast.success(message || "Copied to clipboard."))
    .catch(() => toast.error("Unable to copy. Please copy it manually."));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function printTransaction(transaction) {
  if (!transaction) return;
  const rows = [
    ["Status", statusMeta(transaction.status).label],
    ["Reference", transaction.transactionReference || "—"],
    ["Amount", money(transaction.amount, transaction.currency)],
    ["Sender account", transaction.senderAccountNumber || "—"],
    ["Receiver account", transaction.receiverAccountNumber || "—"],
    ["Description", transaction.description || "No description"],
    ["Created", dateText(transaction.createdAt)],
    ["Completed", dateText(transaction.completedAt)],
  ].map(([label, value]) =>
    `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
  ).join("");
  const popup = window.open("", "_blank", "width=720,height=820");
  if (!popup) {
    toast.error("Allow pop-ups to print the receipt.");
    return;
  }
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>SafePay transaction receipt</title>
  <style>body{font-family:Arial,sans-serif;max-width:680px;margin:32px auto;padding:24px;color:#13213a}header{border-bottom:3px solid #0891b2;padding-bottom:18px}h1{margin:0;color:#075985}p{color:#64748b}.amount{font-size:30px;font-weight:800;margin:28px 0}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:13px 8px;border-bottom:1px solid #e2e8f0;overflow-wrap:anywhere}th{width:35%;color:#64748b}@media print{body{margin:0}}</style></head><body>
  <header><h1>SafePay</h1><p>Digital payment transaction receipt</p></header>
  <div class="amount">${escapeHtml(money(transaction.amount, transaction.currency))}</div>
  <table>${rows}</table><p>Keep this receipt for your records. Status shown is the status returned by SafePay.</p>
  </body></html>`);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 350);
}

function TransactionDetails({ transaction, accountNumber, onClose }) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!transaction) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [transaction, onClose]);

  return (
    <AnimatePresence>
      {transaction && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 p-3 backdrop-blur-md sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
          <motion.section
            role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title"
            initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-cyan-300/25 bg-[#0b1730] text-white shadow-[0_25px_100px_rgba(0,0,0,.55)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-blue-500/15 via-cyan-400/10 to-violet-500/15 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="rounded-2xl border border-cyan-300/30 bg-cyan-300/15 p-3 text-cyan-200"><ReceiptText size={23} /></span>
                <div>
                  <h2 id="transaction-modal-title" className="text-xl font-extrabold">Transaction details</h2>
                  <p className="mt-1 break-all font-mono text-xs font-semibold text-sky-200">{transaction.transactionReference || "Reference unavailable"}</p>
                </div>
              </div>
              <button onClick={onClose} aria-label="Close details" className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-rose-400/15 hover:text-rose-200"><X size={19} /></button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="rounded-2xl border border-blue-300/20 bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-violet-500/20 p-5">
                <p className="text-sm font-semibold text-sky-100">Transaction amount</p>
                <p className="mt-2 break-words text-3xl font-black tracking-tight sm:text-4xl">{money(transaction.amount, transaction.currency)}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <StatusBadge status={transaction.status} />
                  <span className="text-xs font-medium text-slate-300">{getDirection(transaction, accountNumber) === "received" ? "Incoming payment" : getDirection(transaction, accountNumber) === "sent" ? "Outgoing payment" : "Account transaction"}</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Reference", transaction.transactionReference || "—"],
                  ["Description", transaction.description || "No description"],
                  ["Sender account", transaction.senderAccountNumber || "Not supplied"],
                  ["Receiver account", transaction.receiverAccountNumber || "Not supplied"],
                  ["Created at", dateText(transaction.createdAt)],
                  ["Completed at", dateText(transaction.completedAt)],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0 rounded-xl border border-white/10 bg-[#071226] p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1.5 break-words text-sm font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button onClick={() => safeCopy(transaction.transactionReference, "Transaction reference copied.")} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 font-bold text-cyan-100 transition hover:bg-cyan-300/20"><Copy size={16} /> Copy reference</button>
                <button onClick={() => printTransaction(transaction)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 px-4 py-3 font-extrabold text-white shadow-lg shadow-cyan-500/15 transition hover:brightness-110"><Printer size={16} /> Print receipt</button>
              </div>
              <p className="flex items-start gap-2 text-xs leading-5 text-slate-300"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-300" /> This view displays the transaction details returned by the SafePay backend.</p>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SummaryCard({ title, value, icon: Icon, accent, note }) {
  const accents = {
    blue: "border-blue-400/25 from-blue-500/20 to-blue-500/[0.03] text-blue-200",
    green: "border-emerald-400/25 from-emerald-500/20 to-emerald-500/[0.03] text-emerald-200",
    amber: "border-amber-400/25 from-amber-500/20 to-amber-500/[0.03] text-amber-200",
    rose: "border-rose-400/25 from-rose-500/20 to-rose-500/[0.03] text-rose-200",
  };
  return (
    <motion.div whileHover={{ y: -3 }} className={`rounded-2xl border bg-gradient-to-br p-4 sm:p-5 ${accents[accent]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-200">{title}</span>
        <span className="rounded-xl border border-white/10 bg-[#020617]/30 p-2"><Icon size={18} /></span>
      </div>
      <p className="mt-4 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-300">{note}</p>
    </motion.div>
  );
}

function TransactionHistoryPage() {
  const reduceMotion = useReducedMotion();
  const [transactions, setTransactions] = useState([]);
  const [accountNumber, setAccountNumber] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchText, setSearchText] = useState("");
  const [referenceInput, setReferenceInput] = useState("");
  const [referenceMode, setReferenceMode] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, size: PAGE_SIZE };
      // These filters are passed through to the existing transaction-list endpoint.
      if (status) params.status = status;
      if (type) params.type = type;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const response = await api.get("/api/transactions", { params });
      const data = response.data;
      const rows = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
      setTransactions(rows);
      setTotalPages(Number(data?.totalPages ?? (rows.length ? 1 : 0)));
      setTotalElements(Number(data?.totalElements ?? rows.length));
    } catch (err) {
      setTransactions([]);
      setTotalPages(0);
      setTotalElements(0);
      setError(err.response?.status === 401 || err.response?.status === 403
        ? "Your session may have expired. Please sign in again."
        : err.response?.data?.message || "Unable to load transactions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, status, type, fromDate, toDate]);

  useEffect(() => {
    api.get("/api/accounts/me")
      .then((response) => setAccountNumber(response.data?.accountNumber || ""))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!referenceMode) loadTransactions();
  }, [loadTransactions, referenceMode]);

  const visibleTransactions = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query || referenceMode) return transactions;
    return transactions.filter((item) => [
      item.transactionReference, item.description, item.status,
      item.senderAccountNumber, item.receiverAccountNumber,
    ].some((value) => String(value ?? "").toLowerCase().includes(query)));
  }, [transactions, searchText, referenceMode]);

  const summary = useMemo(() => ({
    successful: transactions.filter((t) => normalizedStatus(t.status) === "SUCCESS").length,
    pending: transactions.filter((t) => normalizedStatus(t.status) === "PENDING").length,
    failed: transactions.filter((t) => ["FAILED", "CANCELLED"].includes(normalizedStatus(t.status))).length,
  }), [transactions]);

  async function searchByReference(event) {
    event?.preventDefault?.();
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
      // Existing detail endpoint; backend decides whether this reference is accessible.
      const response = await api.get(`/api/transactions/${encodeURIComponent(reference)}`);
      setTransactions(response.data ? [response.data] : []);
      setTotalPages(response.data ? 1 : 0);
      setTotalElements(response.data ? 1 : 0);
      setPage(0);
    } catch (err) {
      setTransactions([]);
      setTotalPages(0);
      setTotalElements(0);
      setError(err.response?.status === 404
        ? "No transaction was found for that reference."
        : err.response?.status === 401 || err.response?.status === 403
          ? "You are not authorized to view this transaction. Sign in again if your session expired."
          : err.response?.data?.message || "Unable to search for this transaction.");
    } finally {
      setLoading(false);
    }
  }

  function applyFilters(event) {
    event.preventDefault();
    if (fromDate && toDate && fromDate > toDate) {
      toast.error("The start date cannot be after the end date.");
      return;
    }
    setReferenceMode(false);
    setSelectedTransaction(null);
    setPage(0);
    // State changes trigger the list endpoint with the selected filters.
  }

  function resetFilters() {
    setStatus("");
    setType("");
    setFromDate("");
    setToDate("");
    setSearchText("");
    setReferenceInput("");
    setReferenceMode(false);
    setSelectedTransaction(null);
    setPage(0);
  }

  function refresh() {
    if (referenceMode) {
      searchByReference();
    } else {
      loadTransactions();
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 text-white sm:space-y-7">
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-blue-400/25 bg-gradient-to-br from-[#101f43] via-[#101a38] to-[#281252] p-5 shadow-xl shadow-blue-950/20 sm:p-7 lg:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-extrabold tracking-[0.15em] text-cyan-200">
              <ReceiptText size={14} /> PAYMENT ACTIVITY
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Transaction history</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-200 sm:text-base">
              Track incoming and outgoing payments, inspect transaction details, and print receipts.
            </p>
          </div>
          <motion.div whileHover={{ rotate: -4, scale: 1.03 }} className="hidden rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-4 text-cyan-200 md:block">
            <Wallet size={36} />
          </motion.div>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Records on this page" value={transactions.length} icon={ReceiptText} accent="blue" note={`${totalElements} record(s) in result set`} />
        <SummaryCard title="Successful" value={summary.successful} icon={CheckCircle2} accent="green" note="Successful records on this page" />
        <SummaryCard title="Pending" value={summary.pending} icon={Clock3} accent="amber" note="Awaiting final status" />
        <SummaryCard title="Failed / cancelled" value={summary.failed} icon={XCircle} accent="rose" note="Review details before retrying" />
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#0b1730] p-4 shadow-lg shadow-black/10 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-xl bg-blue-400/15 p-2.5 text-blue-200"><Search size={19} /></span>
          <div>
            <h2 className="font-extrabold">Find a payment</h2>
            <p className="text-sm text-slate-300">Search the loaded page or look up an exact transaction reference.</p>
          </div>
        </div>
        <form onSubmit={searchByReference} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-200" />
            <input value={referenceInput} onChange={(e) => setReferenceInput(e.target.value)} placeholder="Exact transaction reference" maxLength={150} aria-label="Transaction reference" className="w-full rounded-xl border border-slate-600 bg-[#050d1d] py-3 pl-11 pr-4 font-semibold text-white outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/15" />
          </div>
          <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-5 py-3 font-extrabold text-white shadow-md shadow-black/20 transition hover:border-slate-500 hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"><Search size={17} /> Search reference</button>
          {referenceMode && <button type="button" onClick={() => { setReferenceMode(false); setReferenceInput(""); setPage(0); }} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-bold text-white hover:bg-white/10">Back to history</button>}
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0b1730] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-violet-400/15 p-2.5 text-violet-200"><SlidersHorizontal size={18} /></span>
            <div><h2 className="font-extrabold">Filters</h2><p className="text-sm text-slate-300">Narrow records by status, direction, or date.</p></div>
          </div>
          <button type="button" onClick={resetFilters} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-300/10"><RotateCcw size={15} /> Reset</button>
        </div>
        <form onSubmit={applyFilters} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm font-bold text-slate-200">Status
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-[#050d1d] px-3 py-3 font-semibold text-white outline-none focus:border-cyan-300">
              <option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-200">Direction
            <select value={type} onChange={(e) => setType(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-[#050d1d] px-3 py-3 font-semibold text-white outline-none focus:border-cyan-300">
              <option value="">Sent and received</option><option value="SENT">Sent</option><option value="RECEIVED">Received</option>
            </select>
          </label>
          <label className="text-sm font-bold text-slate-200">From date
            <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-[#050d1d] px-3 py-3 font-semibold text-white outline-none focus:border-cyan-300" />
          </label>
          <label className="text-sm font-bold text-slate-200">To date
            <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-[#050d1d] px-3 py-3 font-semibold text-white outline-none focus:border-cyan-300" />
          </label>
          <div className="flex items-end"><button type="submit" disabled={loading} className="w-full rounded-xl border border-cyan-300/30 bg-cyan-300/15 px-4 py-3 font-extrabold text-cyan-100 transition hover:bg-cyan-300/25 disabled:opacity-60">Apply filters</button></div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-blue-300/20 bg-[#0b1730] shadow-xl shadow-black/15">
        <div className="flex flex-col justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-blue-500/10 via-transparent to-violet-500/10 p-4 sm:flex-row sm:items-center sm:p-5">
          <div>
            <h2 className="text-lg font-extrabold">{referenceMode ? "Reference result" : "Your transactions"}</h2>
            <p className="mt-1 text-sm font-medium text-slate-300">{loading ? "Loading records…" : `${visibleTransactions.length} shown · ${totalElements} total record(s)`}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {!referenceMode && <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Filter this page…" aria-label="Filter visible transactions" className="w-full rounded-xl border border-slate-600 bg-[#050d1d] py-2.5 pl-9 pr-3 text-sm font-semibold text-white outline-none placeholder:text-slate-400 focus:border-cyan-300 sm:w-56" /></div>}
            <button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-60"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button>
          </div>
        </div>

        {error && <div role="alert" className="m-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm font-semibold text-rose-200">{error}</div>}

        {loading ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-slate-200"><RefreshCw size={28} className="animate-spin text-cyan-300" /><p className="font-semibold">Loading your transactions…</p></div>
        ) : visibleTransactions.length === 0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center px-5 py-12 text-center">
            <span className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-200"><ReceiptText size={30} /></span>
            <h3 className="mt-4 text-lg font-extrabold">{error ? "Unable to display records" : "No transactions found"}</h3>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-300">{error ? "Refresh to try loading transaction records again." : "Try a different reference or adjust your filters."}</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#071226] text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  <tr><th className="px-5 py-4">Transaction</th><th className="px-5 py-4">Reference</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Amount</th><th className="px-5 py-4 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07]">
                  {visibleTransactions.map((transaction, index) => {
                    const direction = getDirection(transaction, accountNumber);
                    const incoming = direction === "received";
                    const Icon = incoming ? ArrowDownLeft : ArrowUpRight;
                    return (
                      <motion.tr key={transaction.id || transaction.transactionReference || index} initial={reduceMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.2) }} className="transition-colors hover:bg-blue-400/[0.06]">
                        <td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`rounded-xl border p-2.5 ${incoming ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200" : "border-blue-300/25 bg-blue-400/10 text-blue-200"}`}><Icon size={18} /></span><div className="min-w-0"><p className="max-w-56 truncate font-bold text-white">{transaction.description || (incoming ? "Money received" : "Money sent")}</p><p className="mt-1 text-xs font-semibold text-slate-300">{incoming ? "Incoming payment" : direction === "sent" ? "Outgoing payment" : "Payment record"}</p></div></div></td>
                        <td className="px-5 py-4"><span className="font-mono text-xs font-bold text-cyan-200">{transaction.transactionReference || "—"}</span></td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-200">{dateText(transaction.createdAt)}</td>
                        <td className="px-5 py-4"><StatusBadge status={transaction.status} /></td>
                        <td className={`whitespace-nowrap px-5 py-4 text-right font-extrabold ${incoming
                                                                                                  ? "text-emerald-300"
                                                                                                  : direction === "sent"
                                                                                                    ? "text-rose-400"
                                                                                                    : "text-white"}`}>{incoming ? "+" : direction === "sent" ? "−" : ""}{money(transaction.amount, transaction.currency)}</td>
                        <td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => setSelectedTransaction(transaction)} aria-label="View transaction details" className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-extrabold text-cyan-100 transition hover:bg-cyan-300/20"><OpenIcon size={13} /> Details</button><button onClick={() => safeCopy(transaction.transactionReference, "Transaction reference copied.")} aria-label="Copy transaction reference" className="rounded-lg border border-white/10 p-2 text-slate-200 hover:border-cyan-300/30 hover:text-cyan-200"><Copy size={15} /></button></div></td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 md:hidden sm:p-4">
              {visibleTransactions.map((transaction, index) => {
                const direction = getDirection(transaction, accountNumber);
                const incoming = direction === "received";
                const Icon = incoming ? ArrowDownLeft : ArrowUpRight;
                return (
                  <motion.article key={transaction.id || transaction.transactionReference || index} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.2) }} className="rounded-2xl border border-white/10 bg-[#071226] p-4">
                    <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className={`rounded-xl p-2.5 ${incoming ? "bg-emerald-400/15 text-emerald-200" : "bg-blue-400/15 text-blue-200"}`}><Icon size={18} /></span><div className="min-w-0"><p className="truncate font-extrabold text-white">{transaction.description || (incoming ? "Money received" : "Money sent")}</p><p className="mt-1 text-xs text-slate-300">{dateText(transaction.createdAt)}</p></div></div><StatusBadge status={transaction.status} /></div>
                    <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Amount</p><p className={`mt-1 text-xl font-black ${incoming
                                                                                                                                                                                                                 ? "text-emerald-300"
                                                                                                                                                                                                                 : direction === "sent"
                                                                                                                                                                                                                   ? "text-rose-400"
                                                                                                                                                                                                                   : "text-white"}`}>{incoming ? "+" : direction === "sent" ? "−" : ""}{money(transaction.amount, transaction.currency)}</p></div><div className="flex gap-2"><button onClick={() => setSelectedTransaction(transaction)} className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-extrabold text-cyan-100">Details</button><button onClick={() => safeCopy(transaction.transactionReference, "Transaction reference copied.")} aria-label="Copy reference" className="rounded-lg border border-white/10 p-2 text-slate-200"><Copy size={15} /></button></div></div>
                    <p className="mt-3 break-all border-t border-white/10 pt-3 font-mono text-xs text-cyan-200">{transaction.transactionReference || "Reference unavailable"}</p>
                  </motion.article>
                );
              })}
            </div>
          </>
        )}

        {!referenceMode && totalPages > 1 && (
          <div className="flex flex-col justify-between gap-3 border-t border-white/10 bg-[#071226]/70 p-4 sm:flex-row sm:items-center sm:px-5">
            <p className="text-sm font-semibold text-slate-200">Page <span className="text-white">{page + 1}</span> of <span className="text-white">{totalPages}</span></p>
            <div className="flex gap-2">
              <button type="button" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={17} /> Previous</button>
              <button type="button" disabled={page + 1 >= totalPages || loading} onClick={() => setPage((p) => p + 1)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2.5 text-sm font-extrabold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={17} /></button>
            </div>
          </div>
        )}
      </section>

      <TransactionDetails transaction={selectedTransaction} accountNumber={accountNumber} onClose={() => setSelectedTransaction(null)} />
    </div>
  );
}

export default TransactionHistoryPage;

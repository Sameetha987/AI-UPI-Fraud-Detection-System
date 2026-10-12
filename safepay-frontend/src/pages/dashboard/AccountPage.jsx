import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Wallet, ShieldCheck, Copy, RefreshCw, CircleAlert, CheckCircle2,
  ArrowRight, ArrowUpRight, ArrowDownLeft, CalendarDays, Sparkles,
  Eye, EyeOff, Plus, X, LoaderCircle, BadgeCheck, CreditCard,
  CircleDollarSign, LockKeyhole, ReceiptText, Clock3, Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";

const fieldClass = "mt-2 w-full rounded-xl border border-slate-600 bg-[#050d1d] px-4 py-3.5 text-sm font-semibold text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-60";

function money(value, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
  } catch {
    return `₹${Number(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

function dateText(value, includeTime = false) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-IN", includeTime
    ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short", year: "numeric" });
}

function statusStyle(status) {
  switch (String(status || "").toUpperCase()) {
    case "ACTIVE": return "border-emerald-300/35 bg-emerald-300/15 text-emerald-100";
    case "BLOCKED":
    case "CLOSED": return "border-rose-300/35 bg-rose-300/15 text-rose-100";
    case "SUSPENDED": return "border-amber-300/35 bg-amber-300/15 text-amber-100";
    default: return "border-slate-300/25 bg-slate-300/10 text-slate-200";
  }
}

function apiError(error, fallback) {
  const status = error?.response?.status;
  if (status === 401 || status === 403) return "Your session may have expired. Please sign in again.";
  if (status === 400 || status === 409) {
    const message = error?.response?.data?.message;
    return typeof message === "string" && message.trim() ? message : fallback;
  }
  return fallback;
}

export default function AccountPage() {
  const reduceMotion = useReducedMotion();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState("");
  const [depositResult, setDepositResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("safepay_user") || "{}"); }
    catch { return {}; }
  }, []);

  const loadAccount = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError("");
    try {
      const { data } = await api.get("/api/accounts/me");
      setAccount(data);
    } catch (error) {
      setLoadError(apiError(error, "Unable to load your account details. Please try again."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAccount(); }, [loadAccount]);

  async function copyAccountNumber() {
    if (!account?.accountNumber) return toast.error("Account number is unavailable.");
    try {
      await navigator.clipboard.writeText(String(account.accountNumber));
      setCopied(true);
      toast.success("Account number copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Unable to copy. Your browser may require a secure connection.");
    }
  }

  function openDeposit() {
    setDepositAmount("");
    setDepositError("");
    setDepositResult(null);
    setDepositOpen(true);
  }

  async function submitDeposit(event) {
    event.preventDefault();
    setDepositError("");
    const amountText = depositAmount.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(amountText)) {
      setDepositError("Enter a valid amount with no more than two decimal places.");
      return;
    }
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0) {
      setDepositError("Enter an amount greater than zero.");
      return;
    }
    if (amount > 9999999999999999) {
      setDepositError("The amount is too large.");
      return;
    }

    setDepositing(true);
    try {
      // Keep the existing backend contract: POST /api/accounts/deposit with the amount.
      const { data } = await api.post("/api/accounts/deposit", { amount, currency: "INR", });
      setDepositResult(data ?? {});
      setDepositAmount("");
      await loadAccount(true);
      toast.success("Deposit request processed.");
    } catch (error) {
      setDepositError(apiError(error, "The deposit could not be completed. Please review your details and try again."));
    } finally {
      setDepositing(false);
    }
  }

  const accountNumber = account?.accountNumber ? String(account.accountNumber) : "";
  const maskedNumber = accountNumber
    ? `••••  ••••  ${accountNumber.slice(-4)}`
    : "Account number unavailable";
  const currency = account?.currency || "INR";
  const status = String(account?.status || "UNKNOWN").toUpperCase();
  const amountValue = Number(account?.balance ?? account?.availableBalance ?? 0);
  const accountIsActive = status === "ACTIVE";

  const enter = reduceMotion
    ? { initial: false, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-white">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-cyan-300/20 bg-[#0b1730] px-10 py-9 shadow-xl shadow-cyan-950/20">
        <motion.div animate={reduceMotion ? {} : { rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}><RefreshCw size={30} className="text-cyan-200" /></motion.div>
        <p className="font-bold">Loading your SafePay account…</p>
      </div>
    </div>;
  }

  if (loadError && !account) {
    return <motion.section {...enter} className="mx-auto max-w-3xl rounded-3xl border border-rose-300/30 bg-gradient-to-br from-[#211226] to-[#0b1730] p-6 text-white sm:p-8">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-300/25 bg-rose-300/10"><CircleAlert size={24} className="text-rose-200" /></div>
      <h1 className="text-2xl font-black">Unable to load account</h1>
      <p className="mt-3 text-sm leading-6 text-slate-200">{loadError}</p>
      <button onClick={() => loadAccount()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 px-5 py-3 font-extrabold text-white hover:brightness-110"><RefreshCw size={17} /> Try again</button>
    </motion.section>;
  }

  return <div className="mx-auto max-w-6xl space-y-6 text-white sm:space-y-7">
    {/* Hero */}
    <motion.header {...enter} className="relative isolate overflow-hidden rounded-[2rem] border border-cyan-300/30 bg-[#071326] p-5 shadow-2xl shadow-blue-950/35 sm:p-7 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_10%_15%,rgba(0,194,255,.24),transparent_36%),radial-gradient(ellipse_at_90%_5%,rgba(139,92,246,.28),transparent_34%),radial-gradient(ellipse_at_78%_100%,rgba(16,185,129,.17),transparent_36%)]" />
      <motion.div aria-hidden="true" animate={reduceMotion ? {} : { x: [0, 12, 0], y: [0, -8, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full border border-cyan-200/15 bg-cyan-300/5" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-black tracking-[.16em] text-cyan-100"><Sparkles size={14} /> ACCOUNT CENTER</span>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">My Account</h1>
          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-200 sm:text-base">Your balance, account details, and money actions — together in one secure place.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-extrabold ${statusStyle(status)}`}><BadgeCheck size={15} />{status}</span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-blue-200/25 bg-blue-300/10 px-3 py-2 text-xs font-extrabold text-blue-100"><ShieldCheck size={15} /> Server-verified account</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => loadAccount(true)} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-extrabold text-white transition hover:border-cyan-200/40 hover:bg-cyan-300/10 disabled:opacity-60"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />{refreshing ? "Refreshing…" : "Refresh"}</button>
          <button onClick={openDeposit} disabled={!accountIsActive} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={17} /> Add funds</button>
        </div>
      </div>
      {loadError && <div role="status" className="relative mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">{loadError} Showing the last successfully loaded account details.</div>}
    </motion.header>

    {/* Main balance card + compact account summary */}
    <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
      <motion.section {...enter} transition={{ duration: .4, delay: .04 }} className="relative isolate overflow-hidden rounded-[1.8rem] border border-blue-300/30 bg-gradient-to-br from-[#123f8a] via-[#153a78] to-[#073c4b] p-5 shadow-xl shadow-blue-950/30 sm:p-7">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_12%,rgba(34,211,238,.28),transparent_28%),radial-gradient(circle_at_15%_100%,rgba(129,140,248,.20),transparent_35%)]" />
        <motion.div aria-hidden="true" animate={reduceMotion ? {} : { rotate: 360 }} transition={{ duration: 32, repeat: Infinity, ease: "linear" }} className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <motion.div aria-hidden="true" animate={reduceMotion ? {} : { rotate: -360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} className="pointer-events-none absolute -right-5 -top-9 h-44 w-44 rounded-full border border-dashed border-cyan-100/15" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3"><span className="rounded-2xl border border-white/20 bg-white/10 p-3 text-cyan-100 shadow-lg"><Wallet size={23} /></span><div><p className="text-sm font-bold text-blue-50">Available balance</p><p className="mt-1 text-xs font-semibold text-cyan-100/90">Your SafePay wallet</p></div></div>
            <button onClick={() => setBalanceVisible((v) => !v)} aria-label={balanceVisible ? "Hide balance" : "Show balance"} className="rounded-xl border border-white/20 bg-white/10 p-2.5 text-white transition hover:bg-white/20">{balanceVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          <AnimatePresence mode="wait">
            <motion.p key={balanceVisible ? String(amountValue) : "hidden"} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-8 break-words text-4xl font-black tracking-tight text-white sm:text-5xl">
              {balanceVisible ? money(amountValue, currency) : "₹ • • • • • •"}
            </motion.p>
          </AnimatePresence>
          <p className="mt-2 text-sm font-semibold text-blue-100">{balanceVisible ? "Live balance from your account" : "Your balance is hidden"}</p>
          <div className="mt-7 border-t border-white/15 pt-5">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-100/90">Account number</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-lg font-black tracking-[.13em] text-white sm:text-xl">{maskedNumber}</p>
              <button onClick={copyAccountNumber} disabled={!accountNumber} className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-extrabold text-white transition hover:bg-white/20 disabled:opacity-50">{copied ? <CheckCircle2 size={16} className="text-emerald-200" /> : <Copy size={16} />}{copied ? "Copied!" : "Copy number"}</button>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section {...enter} transition={{ duration: .4, delay: .1 }} className="overflow-hidden rounded-[1.8rem] border border-violet-300/25 bg-gradient-to-br from-[#151b3d] via-[#111a32] to-[#21143d] p-5 shadow-xl shadow-violet-950/20 sm:p-6">
        <div className="flex items-center gap-3"><span className="rounded-xl border border-violet-200/25 bg-violet-300/10 p-3 text-violet-100"><CreditCard size={22} /></span><div><h2 className="font-black">Account details</h2><p className="text-xs font-semibold text-slate-300">Account information from SafePay</p></div></div>
        <div className="mt-5 space-y-3">
          <DetailRow label="Account holder" value={user.fullName || "SafePay User"} />
          <DetailRow label="Account ID" value={account?.id ?? "Not available"} />
          <DetailRow label="Currency" value={currency} />
          <DetailRow label="Created on" value={dateText(account?.createdAt)} />
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-cyan-200/20 bg-cyan-300/[.07] p-3 text-xs font-semibold leading-5 text-cyan-50"><LockKeyhole size={15} className="mt-0.5 shrink-0 text-cyan-200" />Your account status and balance are provided by the backend.</div>
      </motion.section>
    </div>

    {/* Actions */}
    <div className="grid gap-4 sm:grid-cols-3">
      <ActionCard icon={Plus} title="Add funds" description="Add a deposit to your account." accent="cyan" onClick={openDeposit} disabled={!accountIsActive} />
      <ActionCard icon={ArrowUpRight} title="Transfer money" description="Send money to a SafePay user." accent="blue" to="/transfer" />
      <ActionCard icon={ReceiptText} title="Transactions" description="Review payments and receipts." accent="violet" to="/transactions" />
    </div>

    <motion.section {...enter} className="flex flex-col gap-4 rounded-2xl border border-emerald-300/25 bg-gradient-to-r from-emerald-400/[.08] via-[#0b1730] to-cyan-400/[.06] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-start gap-3"><span className="rounded-xl border border-emerald-200/25 bg-emerald-300/10 p-2.5 text-emerald-100"><ShieldCheck size={20} /></span><div><h2 className="font-extrabold text-white">SafePay account protection</h2><p className="mt-1 max-w-2xl text-sm leading-5 text-slate-200">Only submit deposits you intend to make. The server response determines whether a deposit was accepted; the interface never assumes success from a button click.</p></div></div>
      <span className="inline-flex shrink-0 items-center gap-2 text-xs font-black text-emerald-100"><CheckCircle2 size={16} /> SECURE SESSION</span>
    </motion.section>

    {/* Deposit dialog */}
    <AnimatePresence>
      {depositOpen && <motion.div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget && !depositing) setDepositOpen(false); }}>
        <motion.section role="dialog" aria-modal="true" aria-labelledby="deposit-title" initial={reduceMotion ? false : { opacity: 0, y: 20, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .98 }} transition={{ type: "spring", stiffness: 260, damping: 24 }} className="my-auto w-full max-w-lg overflow-hidden rounded-[1.8rem] border border-cyan-200/25 bg-[#0b1730] shadow-2xl shadow-cyan-950/40">
          <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-r from-blue-600/35 via-cyan-500/20 to-violet-500/30 p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-6 -top-12 h-32 w-32 rounded-full border border-white/10" />
            <div className="relative flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="rounded-xl border border-cyan-100/25 bg-cyan-300/15 p-3 text-cyan-100"><CircleDollarSign size={23} /></span><div><h2 id="deposit-title" className="text-xl font-black">Add funds</h2><p className="mt-1 text-sm font-medium text-slate-200">Deposit into your SafePay account</p></div></div><button type="button" onClick={() => !depositing && setDepositOpen(false)} aria-label="Close deposit dialog" className="rounded-lg border border-white/15 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"><X size={18} /></button></div>
          </div>
          <div className="p-5 sm:p-6">
            {depositResult ? <motion.div initial={reduceMotion ? false : { opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} className="py-3 text-center">
              {["FAILED", "CANCELLED", "REJECTED"].includes(String(depositResult.status || "").toUpperCase()) ? (
                <motion.div initial={reduceMotion ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-rose-200/30 bg-rose-300/15 text-rose-100"><CircleAlert size={42} /></motion.div>
              ) : ["SUCCESS", "COMPLETED", "SUCCESSFUL"].includes(String(depositResult.status || "").toUpperCase()) ? (
                <motion.div initial={reduceMotion ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-200/30 bg-emerald-300/15 text-emerald-100 shadow-lg shadow-emerald-950/30"><CheckCircle2 size={42} /></motion.div>
              ) : (
                <motion.div initial={reduceMotion ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-cyan-200/30 bg-cyan-300/15 text-cyan-100"><ReceiptText size={38} /></motion.div>
              )}
              <h3 className="mt-5 text-2xl font-black text-white">{["FAILED", "CANCELLED", "REJECTED"].includes(String(depositResult.status || "").toUpperCase()) ? "Deposit not completed" : ["SUCCESS", "COMPLETED", "SUCCESSFUL"].includes(String(depositResult.status || "").toUpperCase()) ? "Deposit successful" : "Deposit response received"}</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-200">The backend returned this result. Check the status and refreshed balance before treating the deposit as complete.</p>
              {depositResult.status && <p className={`mt-4 inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${["FAILED", "CANCELLED", "REJECTED"].includes(String(depositResult.status || "").toUpperCase()) ? "border-rose-200/25 bg-rose-300/10 text-rose-100" : ["SUCCESS", "COMPLETED", "SUCCESSFUL"].includes(String(depositResult.status || "").toUpperCase()) ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100" : "border-amber-200/25 bg-amber-300/10 text-amber-100"}`}>Status: {String(depositResult.status)}</p>}
              {depositResult.transactionReference && <div className="mt-4 rounded-xl border border-white/10 bg-[#050d1d] p-3 text-left"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Reference</p><p className="mt-1 break-all font-mono text-sm font-bold text-cyan-100">{depositResult.transactionReference}</p></div>}
              <button onClick={() => { setDepositOpen(false); setDepositResult(null); }} className="mt-5 w-full rounded-xl bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 px-4 py-3 font-black text-white hover:brightness-110">Done</button>
            </motion.div> : <form onSubmit={submitDeposit} className="space-y-5">
              <div className="rounded-xl border border-blue-200/20 bg-blue-300/[.07] p-4"><p className="text-xs font-bold uppercase tracking-wider text-blue-100">Current available balance</p><p className="mt-1 text-2xl font-black text-white">{money(amountValue, currency)}</p></div>
              <label className="block text-sm font-extrabold text-slate-100" htmlFor="deposit-amount">Deposit amount ({currency})<div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-cyan-200">{currency === "INR" ? "₹" : currency}</span><input id="deposit-amount" name="amount" autoFocus inputMode="decimal" type="number" min="0.01" step="0.01" value={depositAmount} onChange={(e) => { setDepositAmount(e.target.value); setDepositError(""); }} className={`${fieldClass} pl-12 text-lg`} placeholder="0.00" disabled={depositing} required /></div></label>
              <div className="grid grid-cols-3 gap-2">{[500, 1000, 2000].map((amount) => <button key={amount} type="button" disabled={depositing} onClick={() => { setDepositAmount(String(amount)); setDepositError(""); }} className={`rounded-xl border px-3 py-2.5 text-sm font-black transition ${Number(depositAmount) === amount ? "border-cyan-200/50 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[.03] text-slate-200 hover:border-cyan-200/30 hover:bg-cyan-300/[.07]"}`}>+{money(amount, currency)}</button>)}</div>
              <p className="flex items-start gap-2 text-xs leading-5 text-slate-300"><CircleAlert size={15} className="mt-0.5 shrink-0 text-amber-200" />This deposit uses your existing backend endpoint. Only submit a deposit if your application is configured to accept it.</p>
              <AnimatePresence>{depositError && <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="rounded-xl border border-rose-300/30 bg-rose-300/10 p-3 text-sm font-semibold text-rose-100">{depositError}</motion.p>}</AnimatePresence>
              <div className="grid gap-2 sm:grid-cols-2"><button type="button" disabled={depositing} onClick={() => setDepositOpen(false)} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-bold text-slate-100 transition hover:bg-white/10 disabled:opacity-50">Cancel</button><button type="submit" disabled={depositing || !depositAmount.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 px-4 py-3 font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-55">{depositing ? <LoaderCircle size={18} className="animate-spin" /> : <Plus size={18} />}{depositing ? "Processing…" : "Confirm deposit"}</button></div>
            </form>}
          </div>
        </motion.section>
      </motion.div>}
    </AnimatePresence>
  </div>;
}

function DetailRow({ label, value }) {
  return <div className="flex items-start justify-between gap-4 border-b border-white/[.07] pb-3 last:border-0 last:pb-0"><span className="text-xs font-semibold text-slate-400">{label}</span><span className="max-w-[62%] break-words text-right text-sm font-extrabold text-white">{value}</span></div>;
}

function ActionCard({ icon: Icon, title, description, accent, to, onClick, disabled }) {
  const styles = {
    cyan: "border-cyan-300/25 from-cyan-400/[.12] to-blue-500/[.04] text-cyan-100 group-hover:border-cyan-200/45",
    blue: "border-blue-300/25 from-blue-400/[.13] to-indigo-500/[.05] text-blue-100 group-hover:border-blue-200/45",
    violet: "border-violet-300/25 from-violet-400/[.13] to-fuchsia-500/[.05] text-violet-100 group-hover:border-violet-200/45",
  };
  const content = <><span className={`rounded-xl border border-white/10 bg-white/[.06] p-3 ${styles[accent]?.split(" ").filter((s) => s.startsWith("text-")).join(" ")}`}><Icon size={21} /></span><div className="min-w-0 flex-1"><h2 className="font-black text-white">{title}</h2><p className="mt-1 text-sm leading-5 text-slate-300">{description}</p></div><ArrowRight size={18} className="shrink-0 text-slate-300 transition group-hover:translate-x-1" /></>;
  const className = `group flex min-w-0 items-center gap-3 rounded-2xl border bg-gradient-to-br p-4 text-left shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 ${styles[accent]}`;
  return to ? <Link to={to} className={className}>{content}</Link> : <button type="button" onClick={onClick} disabled={disabled} className={className}>{content}</button>;
}

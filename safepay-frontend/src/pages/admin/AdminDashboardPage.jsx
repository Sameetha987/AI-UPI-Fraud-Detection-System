import { useEffect, useState } from "react";
import { Users, Wallet, Store, ArrowLeftRight, CheckCircle2, XCircle, Clock3, ShieldAlert, RefreshCw } from "lucide-react";
import api from "../../lib/api";

const cards = [
  ["Registered users", "totalUsers", Users], ["Active users", "activeUsers", CheckCircle2],
  ["Accounts", "totalAccounts", Wallet], ["Active merchants", "activeMerchants", Store],
  ["Transactions", "totalTransactions", ArrowLeftRight], ["Successful", "successfulTransactions", CheckCircle2],
  ["Failed", "failedTransactions", XCircle], ["Pending", "pendingTransactions", Clock3],
];
const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));

export default function AdminDashboardPage({ merchantMode = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        const response = await api.get(merchantMode ? "/api/merchant/transactions" : "/api/admin/dashboard", merchantMode ? { params: { page: 0, size: 5 } } : undefined);
        if (active) setData(response.data);
      } catch (e) {
        if (active) setError(e.response?.status === 403 ? "Your role is not permitted to view this information." : "Unable to load live dashboard data. Please try again.");
      } finally { if (active) setLoading(false); }
    }
    load(); return () => { active = false; };
  }, [merchantMode]);

  if (merchantMode) return <section className="mx-auto max-w-6xl space-y-6">
    <div><p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">Merchant workspace</p><h1 className="mt-2 text-3xl font-bold">Business overview</h1><p className="mt-2 text-slate-400">Review your business transactions and payment activity.</p></div>
    {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-red-200">{error}</p>}
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-6"><h2 className="text-lg font-semibold">Recent transactions</h2>{loading ? <p className="mt-4 text-slate-400">Loading transactions…</p> : <pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm text-slate-300">{JSON.stringify(data?.content ?? data ?? [], null, 2)}</pre>}</div>
  </section>;

  return <section className="mx-auto max-w-7xl space-y-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">Security operations</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Admin Dashboard</h1><p className="mt-2 text-slate-400">Platform-wide activity and operational overview.</p></div><button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"><RefreshCw size={16}/>Refresh</button></div>
    {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-red-200">{error}</div>}
    {loading ? <div className="rounded-2xl border border-white/10 bg-slate-900 p-8 text-slate-400">Loading live platform statistics…</div> : data && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, key, Icon]) => <article key={key} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5"><div className="flex items-center justify-between"><p className="text-sm text-slate-400">{label}</p><Icon className="text-cyan-300" size={20}/></div><p className="mt-4 text-3xl font-bold">{Number(data[key] ?? 0).toLocaleString("en-IN")}</p></article>)}</div>
      <div className="grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border border-white/10 bg-slate-900/80 p-6"><div className="flex items-center gap-3"><Wallet className="text-cyan-300"/><h2 className="text-lg font-semibold">Transaction volume</h2></div><p className="mt-5 text-3xl font-bold">{money(data.totalTransactionVolume)}</p><p className="mt-2 text-sm text-slate-400">Total transaction volume reported by the backend.</p></article>
      <article className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6"><div className="flex items-center gap-3"><ShieldAlert className="text-amber-300"/><h2 className="text-lg font-semibold">Security analytics</h2></div><p className="mt-3 text-sm leading-6 text-slate-300">AI analytics are available in the dedicated admin security section. Only persisted assessments and validated model metrics should be shown as live fraud statistics.</p><a href="/admin/ai-security" className="mt-4 inline-flex rounded-xl bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20">Open AI Security Analytics</a></article></div>
    </>}
  </section>;
}

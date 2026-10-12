import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Wallet, ArrowLeftRight, History, ShieldCheck, Users, Store, Activity, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const customerNavigation = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "My Account", path: "/account", icon: Wallet },
  { label: "Transfer Money", path: "/transfer", icon: ArrowLeftRight },
  { label: "Transactions", path: "/transactions", icon: History },
];
const merchantNavigation = [
  { label: "Merchant Dashboard", path: "/merchant/dashboard", icon: LayoutDashboard },
  { label: "My Business", path: "/merchant/profile", icon: Store },
  { label: "Payments", path: "/merchant/payments", icon: ArrowLeftRight },
  { label: "Transactions", path: "/merchant/transactions", icon: History },
];
const adminNavigation = [
  { label: "Admin Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "User Management", path: "/admin/users", icon: Users },
  { label: "Transaction Monitoring", path: "/admin/transactions", icon: Activity },
  { label: "Merchant Management", path: "/admin/merchants", icon: Store },
  { label: "AI Security Analytics", path: "/admin/ai-security", icon: ShieldCheck },
];

function DashboardLayout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  let user = {};
  try { user = JSON.parse(localStorage.getItem("safepay_user") || "{}"); } catch { user = {}; }
  const role = String(user.role || "USER").toUpperCase();
  const navigation = role === "ADMIN" ? adminNavigation : role === "MERCHANT" ? merchantNavigation : customerNavigation;

  function logout() {
    localStorage.removeItem("safepay_token");
    localStorage.removeItem("safepay_user");
    toast.success("You have been logged out.");
    navigate("/login", { replace: true });
  }
  const nav = navigation.map(({ label, path, icon: Icon }) => (
    <NavLink key={path} to={path} end onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive ? "bg-cyan-400/10 text-cyan-300 border border-cyan-400/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
      <Icon size={19} />{label}
    </NavLink>
  ));

  return <div className="min-h-screen bg-slate-950 text-white">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-slate-900/80 p-5 lg:flex">
      <button onClick={() => navigate("/")} className="mb-10 flex items-center gap-3 text-left">
        <span className="rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 p-3"><ShieldCheck size={23} /></span>
        <span><span className="block text-xl font-bold">SafePay AI</span><span className="block text-xs text-slate-400">{role === "ADMIN" ? "Security Operations" : role === "MERCHANT" ? "Merchant Workspace" : "Secure digital payments"}</span></span>
      </button>
      <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">{role === "ADMIN" ? "Administration" : role === "MERCHANT" ? "Business Workspace" : "My Workspace"}</p>
      <nav className="space-y-2">{nav}</nav>
      <div className="mt-auto border-t border-white/10 pt-5"><div className="mb-4 px-3"><p className="truncate font-medium">{user.fullName || "SafePay User"}</p><p className="truncate text-xs text-slate-400">{user.email || ""}</p><span className="mt-2 inline-block rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-300">{role}</span></div>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-300"><LogOut size={19}/>Logout</button>
      </div>
    </aside>
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-5 py-4 backdrop-blur-xl lg:hidden"><span className="font-bold">SafePay AI</span><button onClick={() => setMobileMenuOpen(v => !v)} aria-label="Toggle menu" className="rounded-lg border border-white/10 p-2">{mobileMenuOpen ? <X size={21}/> : <Menu size={21}/>}</button></header>
    {mobileMenuOpen && <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950 p-5 pt-20 lg:hidden"><nav className="space-y-2">{nav}</nav><button onClick={logout} className="mt-6 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-300"><LogOut size={19}/>Logout</button></div>}
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:ml-64 lg:px-10"><Outlet/></main>
  </div>;
}
export default DashboardLayout;

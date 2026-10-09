import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  History,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "My Account", path: "/account", icon: Wallet },
  { label: "Transfer Money", path: "/transfer", icon: ArrowLeftRight },
  { label: "Transactions", path: "/transactions", icon: History },
  { label: "AI Security", path: "/ai-security", icon: ShieldCheck },
];

function DashboardLayout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("safepay_user") || "{}");

  function logout() {
    localStorage.removeItem("safepay_token");
    localStorage.removeItem("safepay_user");

    toast.success("You have been logged out.");
    navigate("/login", { replace: true });
  }

  function renderNavigation() {
    return navigation.map(({ label, path, icon: Icon }) => (
      <NavLink
        key={path}
        to={path}
        end={path === "/dashboard"}
        onClick={() => setMobileMenuOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
            isActive
              ? "bg-cyan-400/10 text-cyan-300 border border-cyan-400/20"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`
        }
      >
        <Icon size={19} />
        {label}
      </NavLink>
    ));
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-slate-900/80 p-5 lg:flex">
        <button
          onClick={() => navigate("/")}
          className="mb-10 flex items-center gap-3 text-left"
        >
          <span className="rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 p-3">
            <ShieldCheck size={23} />
          </span>

          <span>
            <span className="block text-xl font-bold">SafePay AI</span>
            <span className="block text-xs text-slate-400">
              Secure digital payments
            </span>
          </span>
        </button>

        <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Workspace
        </p>

        <nav className="space-y-2">{renderNavigation()}</nav>

        <div className="mt-auto border-t border-white/10 pt-5">
          <div className="mb-4 px-3">
            <p className="truncate font-medium">
              {user.fullName || "SafePay User"}
            </p>
            <p className="truncate text-xs text-slate-400">
              {user.email || ""}
            </p>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={19} />
            Logout
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-5 py-4 backdrop-blur-xl lg:hidden">
        <span className="font-bold">SafePay AI</span>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          className="rounded-lg border border-white/10 p-2"
        >
          {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950 p-5 pt-20 lg:hidden">
          <nav className="space-y-2">{renderNavigation()}</nav>

          <button
            onClick={logout}
            className="mt-6 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-300"
          >
            <LogOut size={19} />
            Logout
          </button>
        </div>
      )}

      <main className="min-h-screen px-5 py-8 sm:px-8 lg:ml-64 lg:px-10">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
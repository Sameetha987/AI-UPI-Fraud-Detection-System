import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { UserRound, Mail, Phone, ShieldCheck, CalendarDays, Pencil, Save, X, LoaderCircle, CheckCircle2, LockKeyhole, Eye, EyeOff, KeyRound, RefreshCw, CircleAlert, BadgeCheck, Sparkles, Fingerprint, WalletCards, Zap } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";

const field = "mt-2 w-full rounded-xl border border-slate-600 bg-[#050d1d] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/15";
const label = "block text-sm font-bold text-slate-200";
const errText = (e, fallback) => {
  const s = e?.response?.status;
  if (s === 401 || s === 403) return "Your session may have expired. Please sign in again.";
  const m = e?.response?.data?.message;
  return (s === 400 || s === 409) && typeof m === "string" && m.trim() ? m : fallback;
};

export default function ProfilePage() {
  const reduceMotion = useReducedMotion();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [visible, setVisible] = useState({});
  const [changing, setChanging] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const { data } = await api.get("/api/users/me");
      setProfile(data);
      setForm({ fullName: data?.fullName || "", phone: data?.phone || "" });
      try {
        const cached = JSON.parse(localStorage.getItem("safepay_user") || "{}");
        localStorage.setItem("safepay_user", JSON.stringify({ ...cached, fullName: data?.fullName ?? cached.fullName, email: data?.email ?? cached.email, role: data?.role ?? cached.role }));
      } catch {}
    } catch (e) { setLoadError(errText(e, "We couldn't load your profile. Please try again.")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadProfile(); }, [loadProfile]);

  function beginEdit() {
    setForm({ fullName: profile?.fullName || "", phone: profile?.phone || "" });
    setEditing(true);
  }
  function cancelEdit() {
    setForm({ fullName: profile?.fullName || "", phone: profile?.phone || "" });
    setEditing(false);
  }
  async function saveProfile(e) {
    e.preventDefault();
    const fullName = form.fullName.trim(), phone = form.phone.trim();
    if (fullName.length < 2 || fullName.length > 100) return toast.error("Enter a name between 2 and 100 characters.");
    if (!/^\d{10}$/.test(phone)) return toast.error("Enter a valid 10-digit mobile number.");
    setSaving(true);
    try {
      const { data } = await api.put("/api/users/me", { fullName, phone });
      const updated = data || { ...profile, fullName, phone };
      setProfile((old) => ({ ...old, ...updated }));
      setForm({ fullName: updated.fullName || fullName, phone: updated.phone || phone });
      try {
        const cached = JSON.parse(localStorage.getItem("safepay_user") || "{}");
        localStorage.setItem("safepay_user", JSON.stringify({ ...cached, fullName: updated.fullName || fullName, email: updated.email || profile?.email || cached.email, role: updated.role || profile?.role || cached.role }));
      } catch {}
      setEditing(false); toast.success("Profile updated successfully.");
    } catch (e) { toast.error(errText(e, "Unable to update your profile.")); }
    finally { setSaving(false); }
  }
  function updatePassword(e) {
    const { name, value } = e.target;
    setPassword((old) => ({ ...old, [name]: value }));
    setPasswordError(""); setPasswordSuccess(false);
  }
  async function changePassword(e) {
    e.preventDefault(); setPasswordError(""); setPasswordSuccess(false);
    const { currentPassword, newPassword, confirmPassword } = password;
    if (!currentPassword || !newPassword || !confirmPassword) return setPasswordError("Complete all three password fields.");
    if (newPassword.length < 8) return setPasswordError("Your new password must contain at least 8 characters.");
    if (newPassword.length > 72) return setPasswordError("Your new password is too long.");
    if (newPassword === currentPassword) return setPasswordError("Choose a password different from your current password.");
    if (newPassword !== confirmPassword) return setPasswordError("The new password and confirmation do not match.");
    setChanging(true);
    try {
      await api.put("/api/users/me/password", { currentPassword, newPassword });
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordSuccess(true); toast.success("Password changed successfully.");
    } catch (e) { setPasswordError(errText(e, "Unable to change your password. Check your current password and try again.")); }
    finally { setChanging(false); }
  }

  const p = password.newPassword;
  const strength = !p ? 0 : [p.length >= 8, /[A-Z]/.test(p) && /[a-z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
  const strengthLabel = ["Not entered", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["bg-slate-700", "bg-rose-400", "bg-amber-300", "bg-cyan-300", "bg-emerald-300"][strength];
  const role = String(profile?.role || "USER").toUpperCase();
  const status = String(profile?.status || "UNKNOWN").toUpperCase();
  const initials = (profile?.fullName || "SafePay User").trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  const statusClass = status === "ACTIVE" ? "border-emerald-300/30 bg-emerald-300/15 text-emerald-200" : ["BLOCKED", "SUSPENDED"].includes(status) ? "border-rose-300/30 bg-rose-300/15 text-rose-200" : "border-amber-300/30 bg-amber-300/15 text-amber-100";

  return <div className="mx-auto max-w-6xl space-y-6 text-white">
    <motion.header initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative isolate overflow-hidden rounded-[2rem] border border-cyan-300/30 bg-[#071326] p-5 shadow-2xl shadow-blue-950/40 sm:p-8 lg:p-9">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_12%_15%,rgba(0,194,255,.24),transparent_38%),radial-gradient(ellipse_at_90%_10%,rgba(139,92,246,.32),transparent_34%),radial-gradient(ellipse_at_80%_100%,rgba(16,185,129,.18),transparent_36%)]" />
      <motion.div aria-hidden="true" animate={reduceMotion ? {} : { x: [0, 12, 0], y: [0, -10, 0], rotate: [0, 5, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border border-cyan-200/20 bg-cyan-300/5 blur-[1px]" />
      <motion.div aria-hidden="true" animate={reduceMotion ? {} : { y: [0, 12, 0], scale: [1, 1.08, 1] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute right-28 top-8 h-20 w-20 rounded-full bg-violet-500/20 blur-2xl" />
      <div className="relative grid items-center gap-8 md:grid-cols-[1fr_260px]">
        <div>
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-black tracking-[.18em] text-cyan-100 shadow-lg shadow-cyan-950/20"><Sparkles size={14}/> YOUR SAFE SPACE</span>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">Your profile.<br/><span className="bg-gradient-to-r from-cyan-200 via-blue-300 to-violet-300 bg-clip-text text-transparent">Your control.</span></h1>
          <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-slate-200 sm:text-base">Personalize your SafePay experience and keep your account details secure, all in one place.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-extrabold text-emerald-100"><ShieldCheck size={15}/> Protected account</span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-violet-300/25 bg-violet-300/10 px-3 py-2 text-xs font-extrabold text-violet-100"><Fingerprint size={15}/> Private details</span>
          </div>
        </div>
        <motion.div initial={reduceMotion ? false : { opacity: 0, scale: .85, rotate: 5 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 110, damping: 14, delay: .12 }} className="relative mx-auto hidden h-56 w-56 md:block">
          <motion.div animate={reduceMotion ? {} : { rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }} className="absolute inset-2 rounded-full border border-dashed border-cyan-200/35"/>
          <motion.div animate={reduceMotion ? {} : { rotate: -360 }} transition={{ duration: 36, repeat: Infinity, ease: "linear" }} className="absolute inset-7 rounded-full border border-violet-200/30"/>
          <motion.div animate={reduceMotion ? {} : { y: [0, -8, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-12 flex flex-col items-center justify-center rounded-[2rem] border border-cyan-100/30 bg-gradient-to-br from-blue-500/40 via-cyan-400/20 to-violet-500/40 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-cyan-100"><UserRound size={35}/></div>
            <span className="mt-3 text-xs font-black tracking-widest text-white">SAFE & SECURE</span>
          </motion.div>
          <motion.span animate={reduceMotion ? {} : { y: [0, -8, 0], x: [0, 3, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute right-1 top-7 rounded-xl border border-emerald-200/30 bg-emerald-300/15 p-3 text-emerald-100 shadow-lg"><CheckCircle2 size={20}/></motion.span>
          <motion.span animate={reduceMotion ? {} : { y: [0, 8, 0], x: [0, -4, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-5 left-0 rounded-xl border border-amber-200/30 bg-amber-300/15 p-3 text-amber-100 shadow-lg"><Zap size={20}/></motion.span>
        </motion.div>
      </div>
    </motion.header>

    {loadError && <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-300/30 bg-rose-400/10 p-4 text-sm font-semibold text-rose-100"><CircleAlert size={19}/><span className="flex-1">{loadError}</span><button onClick={loadProfile} className="inline-flex items-center gap-1 underline"><RefreshCw size={14}/>Retry</button></div>}
    {loading ? <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#0b1730] text-slate-200"><LoaderCircle size={30} className="animate-spin text-cyan-300"/><p className="font-semibold">Loading your profile…</p></div> : profile && <>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <motion.section initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-2xl border border-blue-300/30 bg-gradient-to-br from-[#0c1b36] via-[#0b1730] to-[#10152e] shadow-xl shadow-blue-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-blue-500/10 via-cyan-400/5 to-violet-500/10 p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-cyan-300/10 p-2.5 text-cyan-200"><UserRound size={20}/></span><div><h2 className="font-extrabold">Personal information</h2><p className="text-sm text-slate-300">Edit your name and mobile number.</p></div></div>{!editing && <button onClick={beginEdit} className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2.5 text-sm font-extrabold text-cyan-100 hover:bg-cyan-300/20"><Pencil size={15}/>Edit profile</button>}</div>
          <div className="space-y-3 p-5 sm:p-6">{!editing ? <>
            <Info icon={UserRound} label="Full name" value={profile.fullName || "Not provided"}/><Info icon={Mail} label="Email address" value={profile.email || "Not provided"}/><Info icon={Phone} label="Mobile number" value={profile.phone || "Not provided"}/><Info icon={ShieldCheck} label="Account role" value={role}/>
            <div className="grid gap-3 pt-1 sm:grid-cols-2"><div className="rounded-xl border border-white/10 bg-[#071226] p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Account status</p><span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold ${statusClass}`}><BadgeCheck size={13}/>{status}</span></div><div className="rounded-xl border border-white/10 bg-[#071226] p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Member since</p><p className="mt-2 flex items-center gap-2 text-sm font-bold"><CalendarDays size={15} className="text-cyan-200"/>{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}</p></div></div>
          </> : <form onSubmit={saveProfile} className="space-y-5"><label className={label}>Full name<input name="fullName" autoComplete="name" value={form.fullName} onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))} maxLength={100} className={field} placeholder="Enter your full name"/></label><label className={label}>Mobile number<input name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} maxLength={10} className={field} placeholder="10-digit mobile number"/></label><div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end"><button type="button" disabled={saving} onClick={cancelEdit} className="inline-flex justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-50"><X size={16}/>Cancel</button><button disabled={saving} className="inline-flex justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-cyan-500/15 hover:brightness-110 disabled:opacity-60">{saving ? <LoaderCircle size={17} className="animate-spin"/> : <Save size={17} />}{saving ? "Saving…" : "Save changes"}</button></div></form>}</div>
        </motion.section>
        <motion.section initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .05 }} className="overflow-hidden rounded-2xl border border-emerald-300/30 bg-gradient-to-br from-[#0b2530] via-[#0b1730] to-[#10152e] shadow-xl shadow-emerald-950/20">
          <div className="border-b border-white/10 bg-gradient-to-r from-emerald-400/10 to-cyan-400/5 p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-300/10 p-2.5 text-emerald-200"><ShieldCheck size={20}/></span><div><h2 className="font-extrabold">Account security</h2><p className="text-sm text-slate-300">Protect your sign-in credentials.</p></div></div></div>
          <div className="space-y-4 p-5 sm:p-6"><div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.07] p-4"><p className="flex items-center gap-2 font-extrabold text-emerald-100"><LockKeyhole size={17}/>Password protection</p><p className="mt-1 text-sm leading-5 text-slate-300">Use a unique password and never share it with anyone.</p></div><div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4"><p className="font-extrabold">Server-managed account details</p><p className="mt-1 text-sm leading-5 text-slate-300">Your role, email, and account status cannot be edited here.</p></div><button onClick={() => document.getElementById("change-password")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" })} className="w-full rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 font-extrabold text-emerald-100 hover:bg-emerald-300/20"><KeyRound size={17} className="mr-2 inline"/>Change password ↓</button></div>
        </motion.section>
      </div>

      <motion.section id="change-password" initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="scroll-mt-24 overflow-hidden rounded-2xl border border-violet-300/30 bg-gradient-to-br from-[#171638] via-[#0b1730] to-[#101b35] shadow-xl shadow-violet-950/20">
        <div className="border-b border-white/10 bg-gradient-to-r from-violet-500/15 via-blue-500/10 to-cyan-400/10 p-5 sm:p-6"><div className="flex items-center gap-3"><span className="rounded-xl bg-violet-300/10 p-2.5 text-violet-200"><KeyRound size={20}/></span><div><h2 className="font-extrabold">Change password</h2><p className="text-sm text-slate-300">Confirm your current password before choosing a new one.</p></div></div></div>
        <form onSubmit={changePassword} className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2"><div className="space-y-4">{[["currentPassword","Current password","current-password"],["newPassword","New password","new-password"],["confirmPassword","Confirm new password","new-password"]].map(([name, title, autocomplete]) => <label key={name} className={label}>{title}<div className="relative"><input name={name} type={visible[name] ? "text" : "password"} value={password[name]} onChange={updatePassword} autoComplete={autocomplete} maxLength={72} className={`${field} pr-12`} placeholder={title}/><button type="button" aria-label={`${visible[name] ? "Hide" : "Show"} ${title.toLowerCase()}`} onClick={() => setVisible((s) => ({ ...s, [name]: !s[name] }))} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white">{visible[name] ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>)}</div>
          <div className="flex flex-col"><div className="rounded-2xl border border-white/10 bg-[#071226] p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><p className="font-extrabold">Password strength</p><span className={`text-sm font-extrabold ${strength === 1 ? "text-rose-300" : strength === 2 ? "text-amber-200" : strength === 3 ? "text-cyan-200" : strength === 4 ? "text-emerald-200" : "text-slate-300"}`}>{strengthLabel}</span></div><div className="mt-3 grid grid-cols-4 gap-2">{[0,1,2,3].map((n) => <div key={n} className={`h-2 rounded-full ${n < strength ? strengthColor : "bg-slate-700"}`}/>)}</div><p className="mt-4 text-sm font-semibold text-slate-200">For a stronger password:</p><ul className="mt-2 space-y-2 text-sm text-slate-300"><li className={p.length >= 8 ? "text-emerald-200" : ""}>{p.length >= 8 ? "✓" : "•"} At least 8 characters</li><li className={/[A-Z]/.test(p) && /[a-z]/.test(p) ? "text-emerald-200" : ""}>{/[A-Z]/.test(p) && /[a-z]/.test(p) ? "✓" : "•"} Uppercase and lowercase letters</li><li className={/\d/.test(p) ? "text-emerald-200" : ""}>{/\d/.test(p) ? "✓" : "•"} At least one number</li><li className={/[^A-Za-z0-9]/.test(p) ? "text-emerald-200" : ""}>{/[^A-Za-z0-9]/.test(p) ? "✓" : "•"} Special character (recommended)</li></ul></div>
            <AnimatePresence>{passwordError && <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="mt-3 rounded-xl border border-rose-300/25 bg-rose-300/10 p-3 text-sm font-semibold text-rose-100">{passwordError}</motion.p>}{passwordSuccess && <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-3 text-sm font-bold text-emerald-100"><CheckCircle2 size={17}/>Password updated successfully.</motion.p>}</AnimatePresence>
            <button disabled={changing} className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 px-5 py-3.5 font-extrabold text-white shadow-lg shadow-cyan-500/15 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">{changing ? <LoaderCircle size={18} className="animate-spin"/> : <LockKeyhole size={18} />}{changing ? "Updating password…" : "Update password"}</button><p className="mt-3 text-center text-xs font-medium text-slate-400">Password changes are submitted to your configured SafePay API.</p>
          </div>
        </form>
      </motion.section>
    </>}
  </div>;
}

function Info({ icon: Icon, label: title, value }) {
  return <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#071226] p-4"><span className="rounded-lg border border-cyan-300/15 bg-cyan-300/10 p-2 text-cyan-200"><Icon size={17}/></span><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p><p className="mt-1 break-words text-sm font-bold text-white">{value}</p></div></div>;
}

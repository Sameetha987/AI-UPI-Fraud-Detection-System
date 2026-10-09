import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, LoaderCircle, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";

function getErrorMessage(error) {
  const data = error.response?.data;

  if (typeof data === "string") return data;

  if (typeof data?.message === "string") return data.message;

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors[0].defaultMessage || "Please check your input.";
  }

  if (error.code === "ERR_NETWORK") {
    return "Cannot connect to SafePay. Check that the backend is running.";
  }

  return "Registration failed. Please review your details and try again.";
}

function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (form.password.length < 8 || form.password.length > 72) {
      toast.error("Password must contain between 8 and 72 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/api/auth/register", {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });

      setAccountNumber(response.data.accountNumber || "");
      toast.success(response.data.message || "Registration successful.");
    } catch (error) {
      toast.error(
        error.response ? getErrorMessage(error) : error.message
      );
    } finally {
      setLoading(false);
    }
  }

  if (accountNumber) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-5">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8 text-center">
          <ShieldCheck size={48} className="text-emerald-400 mx-auto mb-5" />

          <h1 className="text-2xl font-bold mb-3">
            Account created successfully
          </h1>

          <p className="text-slate-400 mb-5">
            Your SafePay account is ready. Keep your account number safe.
          </p>

          <div className="rounded-xl border border-cyan-400/20 bg-slate-950 p-4 mb-6">
            <p className="text-sm text-slate-400 mb-2">Account number</p>
            <p className="text-xl font-semibold tracking-wider text-cyan-300">
              {accountNumber}
            </p>
          </div>

          <button
            onClick={() => navigate("/login")}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 font-semibold"
          >
            Continue to Login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-lg">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 mb-8"
        >
          <ArrowLeft size={18} />
          Back to home
        </Link>

        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 mb-6">
            <ShieldCheck size={30} />
          </div>

          <p className="text-sm text-cyan-400 font-semibold mb-2">
            JOIN SAFEPAY
          </p>

          <h1 className="text-3xl font-bold mb-3">Create your account</h1>

          <p className="text-slate-400 mb-8">
            Get started with secure digital payments.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-sm text-slate-300 mb-2">
                Full name
              </label>

              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                value={form.fullName}
                onChange={handleChange}
                placeholder="Your full name"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm text-slate-300 mb-2">
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={150}
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm text-slate-300 mb-2">
                Indian mobile number
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                title="Enter a valid 10-digit Indian mobile number."
                required
                value={form.phone}
                onChange={handleChange}
                placeholder="9876543210"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-slate-300 mb-2">
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                value={form.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm text-slate-300 mb-2">
                Confirm password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Enter your password again"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 font-semibold disabled:opacity-60 flex justify-center items-center gap-2"
            >
              {loading && <LoaderCircle className="animate-spin" size={18} />}
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-7">
            Already registered?{" "}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default RegisterPage;
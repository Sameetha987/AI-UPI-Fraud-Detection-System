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

  return "Login failed. Please check your credentials and try again.";
}

function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/api/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });

      const data = response.data;

      if (!data?.token) {
        throw new Error("The server did not return an authentication token.");
      }

      localStorage.setItem("safepay_token", data.token);

      localStorage.setItem(
        "safepay_user",
        JSON.stringify({
          userId: data.userId,
          fullName: data.fullName,
          email: data.email,
          role: data.role,
        })
      );

      toast.success(`Welcome back, ${data.fullName}!`);

      navigate("/");
    } catch (error) {
      toast.error(
        error.response ? getErrorMessage(error) : error.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
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
            SECURE ACCESS
          </p>

          <h1 className="text-3xl font-bold mb-3">Welcome back</h1>

          <p className="text-slate-400 mb-8">
            Sign in to your SafePay account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm text-slate-300 mb-2"
              >
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
              <label
                htmlFor="password"
                className="block text-sm text-slate-300 mb-2"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 font-semibold disabled:opacity-60 flex justify-center items-center gap-2"
            >
              {loading && <LoaderCircle className="animate-spin" size={18} />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-7">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-cyan-400 hover:text-cyan-300"
            >
              Create one
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;
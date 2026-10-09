import { Link } from "react-router-dom";
import { FaShieldAlt } from "react-icons/fa";
import { motion } from "framer-motion";

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl bg-slate-900/40 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-r from-blue-600 to-cyan-400 p-3 rounded-xl shadow-lg"
          >
            <FaShieldAlt className="text-white text-xl" />
          </motion.div>

          <div>
            <h1 className="text-2xl font-bold text-white">SafePay AI</h1>
            <p className="text-xs text-slate-400">
              Intelligent Fraud Detection
            </p>
          </div>
        </Link>

        <ul className="hidden lg:flex items-center gap-10 text-slate-300">
          <li>
            <Link to="/" className="hover:text-cyan-400 transition">
              Home
            </Link>
          </li>

          <li>
            <a href="/#features" className="hover:text-cyan-400 transition">
              Features
            </a>
          </li>

          <li>
            <a href="/#ai-security" className="hover:text-cyan-400 transition">
              AI Security
            </a>
          </li>

          <li>
            <a href="/#contact" className="hover:text-cyan-400 transition">
              Contact
            </a>
          </li>
        </ul>

        <div className="flex gap-4">
          <Link
            to="/login"
            className="px-6 py-2 rounded-xl border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-white transition"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:scale-105 transition text-white font-semibold shadow-lg"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
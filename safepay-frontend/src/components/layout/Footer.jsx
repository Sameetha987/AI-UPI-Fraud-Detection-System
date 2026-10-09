function Footer() {
  return (
    <footer
      id="contact"
      className="border-t border-white/10 bg-slate-950 px-6 py-8"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <h2 className="text-lg font-bold text-white">SafePay AI</h2>
          <p className="mt-1 text-sm text-slate-400">
            Intelligent Fraud Detection
          </p>
        </div>

        <p className="text-center text-sm text-slate-500">
          AI-powered digital payment security.
        </p>

        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} SafePay AI
        </p>
      </div>
    </footer>
  );
}

export default Footer;
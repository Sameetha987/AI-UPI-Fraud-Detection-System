
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Copy,
  LoaderCircle,
  LockKeyhole,
  Phone,
  Printer,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";

const initialForm = {
  phone: "",
  amount: "",
  description: "",
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "Not provided";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const createIdempotencyKey = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });

const getStatus = (value) => {
  const status = String(value || "").toUpperCase();

  const statuses = {
    SUCCESS: {
      title: "Transfer successful",
      description: "The backend confirmed this transfer as successful.",
      label: "Successful",
      Icon: CheckCircle2,
      color: "emerald",
    },
    PENDING: {
      title: "Transfer pending",
      description:
        "This transfer is awaiting confirmation. Check transaction history for updates.",
      label: "Pending",
      Icon: Clock3,
      color: "amber",
    },
    FAILED: {
      title: "Transfer failed",
      description:
        "The backend reported a failed transfer. Review its details before trying again.",
      label: "Failed",
      Icon: XCircle,
      color: "rose",
    },
    CANCELLED: {
      title: "Transfer cancelled",
      description: "The backend reports that this transfer was cancelled.",
      label: "Cancelled",
      Icon: CircleAlert,
      color: "slate",
    },
  };

  return (
    statuses[status] || {
      title: "Transfer status received",
      description:
        "The final outcome is not confirmed here. Check transaction history before retrying.",
      label: value || "Unknown",
      Icon: CircleAlert,
      color: "blue",
    }
  );
};

const statusStyles = {
  emerald: {
    panel: "border-emerald-200 bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-600",
    text: "text-emerald-800",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
  },
  amber: {
    panel: "border-amber-200 bg-amber-50",
    icon: "bg-amber-100 text-amber-700",
    text: "text-amber-900",
    badge: "border-amber-200 bg-amber-100 text-amber-800",
  },
  rose: {
    panel: "border-rose-200 bg-rose-50",
    icon: "bg-rose-100 text-rose-600",
    text: "text-rose-800",
    badge: "border-rose-200 bg-rose-100 text-rose-800",
  },
  slate: {
    panel: "border-slate-200 bg-slate-50",
    icon: "bg-slate-200 text-slate-300",
    text: "text-slate-800",
    badge: "border-slate-200 bg-slate-100 text-slate-700",
  },
  blue: {
    panel: "border-blue-200 bg-blue-50",
    icon: "bg-blue-100 text-blue-600",
    text: "text-blue-800",
    badge: "border-blue-200 bg-blue-100 text-blue-800",
  },
};

function TransferPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [form, setForm] = useState(initialForm);
  const [receiver, setReceiver] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const animateIn = reduceMotion
    ? { initial: false, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.28 },
      };

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);

    try {
      const response = await api.get("/api/accounts/me");
      const account = response.data;

      const value =
        account?.balance ??
        account?.availableBalance ??
        account?.currentBalance;

      setBalance(
        value === undefined || value === null ? null : Number(value)
      );
    } catch {
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setReceipt(null);
    setShowConfirmation(false);
    setIdempotencyKey("");

    if (field === "phone") {
      setReceiver(null);
    }
  };

  const findReceiver = async (event) => {
    event.preventDefault();

    const phone = form.phone.trim();

    if (!/^\d{10}$/.test(phone)) {
      toast.error("Enter a valid 10-digit mobile number.");
      return;
    }

    setLookupLoading(true);
    setReceiver(null);
    setReceipt(null);
    setIdempotencyKey("");

    try {
      const response = await api.get("/api/users/lookup", {
        params: { phone },
      });

      const data = response.data;

      if (!data?.fullName) {
        toast.error("Recipient details could not be verified.");
        return;
      }

      setReceiver({
        fullName: data.fullName,
        maskedPhone: data.maskedPhone || "Verified recipient",
        maskedAccountNumber:
          data.maskedAccountNumber || "Account verified",
      });

      toast.success("Recipient verified.");
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 401 || status === 403) {
        toast.error("Your session may have expired. Please log in again.");
      } else if (status === 404) {
        toast.error("No eligible recipient was found.");
      } else if (status === 400) {
        toast.error(
          typeof data?.message === "string"
            ? data.message
            : "Check the mobile number and try again."
        );
      } else {
        toast.error("Unable to verify the recipient. Try again.");
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const validatePayment = () => {
    if (!receiver) {
      toast.error("Verify the recipient before continuing.");
      return false;
    }

    if (!/^\d{10}$/.test(form.phone.trim())) {
      toast.error("Enter a valid mobile number.");
      return false;
    }

    if (!form.amount.trim()) {
      toast.error("Enter the transfer amount.");
      return false;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(form.amount.trim())) {
      toast.error("Use up to two decimal places.");
      return false;
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter an amount greater than zero.");
      return false;
    }

    if (amount > 9999999999999999) {
      toast.error("The transfer amount is too large.");
      return false;
    }

    if (balance !== null && amount > balance) {
      toast.error("The amount exceeds your displayed balance.");
      return false;
    }

    if (form.description.trim().length > 255) {
      toast.error("Description cannot exceed 255 characters.");
      return false;
    }

    return true;
  };

  const openConfirmation = async (event) => {
    event.preventDefault();

    if (!validatePayment()) return;

    // Refresh for display. The backend must validate the actual balance.
    await loadBalance();

    setIdempotencyKey((previous) => previous || createIdempotencyKey());
    setShowConfirmation(true);
  };

  const confirmTransfer = async () => {
    if (transferLoading || !receiver) return;

    const requestKey = idempotencyKey || createIdempotencyKey();

    setIdempotencyKey(requestKey);
    setTransferLoading(true);

    try {
      const response = await api.post("/api/transactions/transfer", {
        receiverPhone: form.phone.trim(),
        amount: Number(form.amount),
        currency: "INR",
        description: form.description.trim(),
        idempotencyKey: requestKey,
      });

      const data = response.data || {};

      // Preserve the status supplied by the backend.
      setReceipt({
        ...data,
        receiverName: receiver.fullName,
        receiverPhone: receiver.maskedPhone,
        receiverAccount: receiver.maskedAccountNumber,
      });

      setShowConfirmation(false);

      const status = String(data.status || "").toUpperCase();

      if (status === "SUCCESS") {
        toast.success("Transfer successful.");
        setForm(initialForm);
        setReceiver(null);
        setIdempotencyKey("");
        loadBalance();
      } else if (status === "PENDING") {
        toast("Transfer pending confirmation.");
      } else if (status === "FAILED" || status === "CANCELLED") {
        toast.error(`Transfer ${status.toLowerCase()}.`);
      } else {
        toast("Transfer response received. Check transaction history.");
      }
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;

      let message =
        "Transfer outcome could not be confirmed. Check transaction history before retrying.";

      if (status === 400) {
        message =
          typeof data?.message === "string"
            ? data.message
            : "The transfer was rejected. Check the payment details.";
      } else if (status === 401 || status === 403) {
        message = "Your session may have expired. Please log in again.";
      }

      toast.error(message);

      // Keep the same key and entered details after an uncertain outcome.
      // Do not automatically submit the payment again.
    } finally {
      setTransferLoading(false);
    }
  };

  const copyText = async (value, successMessage = "Copied.") => {
    if (!value) {
      toast.error("Nothing to copy.");
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(String(value));
      toast.success(successMessage);
    } catch {
      toast.error("Unable to copy. Please copy it manually.");
    }
  };

  const printReceipt = () => {
    if (!receipt) return;

    const details = [
      ["Status", getStatus(receipt.status).label],
      ["Amount", money(receipt.amount)],
      ["Recipient", receipt.receiverName || "Not provided"],
      ["Phone", receipt.receiverPhone || "Not provided"],
      ["Account", receipt.receiverAccount || "Not provided"],
      [
        "Reference",
        receipt.transactionReference || receipt.reference || "Not provided",
      ],
      ["Description", receipt.description || "Not provided"],
      [
        "Date",
        formatDate(receipt.completedAt || receipt.createdAt),
      ],
    ];

    const rows = details
      .map(
        ([label, value]) => `
          <tr>
            <th>${escapeHtml(label)}</th>
            <td>${escapeHtml(value)}</td>
          </tr>`
      )
      .join("");

    const popup = window.open("", "_blank", "width=700,height=800");

    if (!popup) {
      toast.error("Allow pop-ups to print the receipt.");
      return;
    }

    popup.document.write(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>SafePay Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 650px; margin: 35px auto; padding: 20px; color: #172033; }
            h1 { margin-bottom: 4px; }
            p { color: #64748b; }
            .amount { margin: 24px 0; font-size: 30px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 13px 8px; text-align: left; border-bottom: 1px solid #e2e8f0; overflow-wrap: anywhere; }
            th { width: 35%; color: #64748b; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>SafePay</h1>
          <p>Transfer receipt</p>
          <div class="amount">${escapeHtml(money(receipt.amount))}</div>
          <table>${rows}</table>
        </body>
      </html>
    `);

    popup.document.close();
    popup.focus();

    window.setTimeout(() => {
      try {
        popup.print();
      } catch {
        toast.error("Unable to open the print dialog.");
      }
    }, 300);
  };

  const startAnotherTransfer = () => {
    setForm(initialForm);
    setReceiver(null);
    setReceipt(null);
    setShowConfirmation(false);
    setIdempotencyKey("");
    loadBalance();
  };

  const statusDetails = receipt ? getStatus(receipt.status) : null;
  const reference = receipt
    ? receipt.transactionReference || receipt.reference
    : null;
  const currentStatusStyles = statusDetails
    ? statusStyles[statusDetails.color]
    : null;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8 text-slate-100">
      {/* Compact heading */}
      <motion.header {...animateIn}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-lg shadow-cyan-950/30">
            <ArrowRightLeft size={21} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
              SafePay transfers
            </p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Transfer money
            </h1>
          </div>
        </div>

        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Verify your recipient, review your payment, and confirm the transfer.
        </p>
      </motion.header>

      {/* Compact security strip */}
      <motion.div
        {...animateIn}
        transition={{ delay: 0.04, duration: 0.28 }}
        className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 px-4 py-3 shadow-sm shadow-black/10"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          <ShieldCheck size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">
            Secure transfers
          </p>
          <p className="mt-0.5 text-xs leading-5 text-slate-300">
            Always verify the recipient and check the final transaction status.
          </p>
        </div>

        <LockKeyhole
          size={18}
          className="hidden shrink-0 text-cyan-300 sm:block"
        />
      </motion.div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* Transfer form */}
        <motion.section
          {...animateIn}
          transition={{ delay: 0.08, duration: 0.3 }}
          className="overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#0d1931] via-[#101f3b] to-[#102b43] shadow-[0_18px_55px_rgba(0,0,0,0.28)]"
        >
          <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-blue-950 via-slate-900 to-violet-950 px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm">
              <Wallet size={21} />
            </div>

            <div>
              <h2 className="font-bold text-white">New transfer</h2>
              <p className="text-xs text-slate-300">
                Enter recipient and payment details.
              </p>
            </div>
          </div>

          <form onSubmit={openConfirmation} className="space-y-5 p-5">
            {/* Recipient */}
            <div>
              <label
                htmlFor="recipient-phone"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                Recipient mobile number
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Phone
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300"
                  />

                  <input
                    id="recipient-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={10}
                    value={form.phone}
                    placeholder="10-digit mobile number"
                    disabled={lookupLoading || transferLoading}
                    onChange={(event) =>
                      updateField(
                        "phone",
                        event.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                    className="w-full rounded-xl border border-slate-600/70 bg-[#050d1d] py-3 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-300 focus:border-cyan-300 focus:bg-[#0a1830] focus:ring-4 focus:ring-cyan-300/25 disabled:opacity-80"
                  />
                </div>

                <button
                  type="button"
                  onClick={findReceiver}
                  disabled={
                    lookupLoading ||
                    transferLoading ||
                    form.phone.length !== 10
                  }
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:from-blue-400 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-75"
                >
                  {lookupLoading ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : receiver ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <ShieldCheck size={16} />
                  )}

                  {lookupLoading
                    ? "Verifying..."
                    : receiver
                      ? "Verified"
                      : "Verify recipient"}
                </button>
              </div>

              <AnimatePresence mode="wait">
                {lookupLoading && (
                  <motion.div
                    key="verifying"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 overflow-hidden"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
                      <LoaderCircle size={18} className="animate-spin" />
                      Checking recipient details...
                    </div>
                  </motion.div>
                )}

                {!lookupLoading && receiver && (
                  <motion.div
                    key="verified"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3"
                    role="status"
                    aria-live="polite"
                  >
                    <motion.div
                      initial={reduceMotion ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 15,
                      }}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
                    >
                      <Check size={22} strokeWidth={3} />
                    </motion.div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-emerald-900">
                        {receiver.fullName}
                      </p>
                      <p className="mt-0.5 text-xs text-emerald-800">
                        {receiver.maskedPhone}
                      </p>
                      <p className="mt-0.5 text-xs text-emerald-700">
                        Account: {receiver.maskedAccountNumber}
                      </p>
                    </div>

                    <CheckCircle2
                      size={20}
                      className="shrink-0 text-emerald-600"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Amount */}
            <div>
              <label
                htmlFor="transfer-amount"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                Transfer amount
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-300">
                  ₹
                </span>

                <input
                  id="transfer-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  placeholder="0.00"
                  disabled={transferLoading}
                  onChange={(event) =>
                    updateField("amount", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-600/70 bg-[#050d1d] py-3.5 pl-10 pr-4 text-xl font-bold text-white outline-none transition placeholder:text-slate-300 focus:border-cyan-300 focus:bg-[#0a1830] focus:ring-4 focus:ring-cyan-300/25 disabled:opacity-80"
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-300">
                  Indian Rupee (INR)
                </span>

                <button
                  type="button"
                  onClick={loadBalance}
                  disabled={balanceLoading || transferLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-200 hover:text-cyan-100 disabled:opacity-70"
                >
                  <RefreshCw
                    size={13}
                    className={balanceLoading ? "animate-spin" : ""}
                  />
                  Refresh balance
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="transfer-description"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                Description{" "}
                <span className="font-normal text-slate-300">Optional</span>
              </label>

              <textarea
                id="transfer-description"
                rows={2}
                maxLength={255}
                value={form.description}
                placeholder="What's this transfer for?"
                disabled={transferLoading}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                className="w-full resize-y rounded-xl border border-slate-600/70 bg-[#050d1d] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-300 focus:border-cyan-300 focus:bg-[#0a1830] focus:ring-4 focus:ring-cyan-300/25 disabled:opacity-80"
              />

              <p className="mt-1 text-right text-xs text-slate-300">
                {form.description.length}/255
              </p>
            </div>

            {/* Compact amount summary */}
            <div className="rounded-xl border border-white/10 bg-[#081326]/65 px-4 py-3.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-300">Transfer amount</span>
                <span className="font-semibold text-slate-100">
                  {money(form.amount)}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-300">Displayed fee</span>
                <span className="font-semibold text-slate-300">
                  Determined by backend
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-dashed border-white/10 pt-3">
                <span className="text-sm font-bold text-slate-200">
                  Amount to send
                </span>
                <span className="text-lg font-bold text-white">
                  {money(form.amount)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!receiver || transferLoading || lookupLoading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-cyan-400/20 transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-75 disabled:hover:translate-y-0"
            >
              Review transfer
              <ArrowRight
                size={17}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-300">
              <LockKeyhole size={13} />
              Review all details before confirming.
            </p>
          </form>
        </motion.section>

        {/* Compact sidebar: balance and reminder only */}
        <motion.aside
          {...animateIn}
          transition={{ delay: 0.12, duration: 0.3 }}
          className="space-y-4"
        >
          <section className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-blue-950 via-indigo-950 to-cyan-950 p-5 text-white shadow-[0_16px_45px_rgba(8,145,178,0.12)]">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/15 blur-2xl" />

            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">
                  Available balance
                </p>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                  <Wallet size={19} />
                </div>
              </div>

              <p className="mt-5 break-words text-2xl font-bold tracking-tight sm:text-3xl">
                {balanceLoading
                  ? "Loading..."
                  : balance === null
                    ? "Unavailable"
                    : money(balance)}
              </p>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <span className="flex items-center gap-1.5 text-xs text-sky-100">
                  <ShieldCheck size={14} />
                  SafePay account
                </span>

                <button
                  type="button"
                  onClick={loadBalance}
                  disabled={balanceLoading}
                  aria-label="Refresh available balance"
                  className="rounded-lg bg-cyan-400/20 text-white px-3 py-2 text-xs font-semibold transition hover:bg-cyan-400/30 disabled:opacity-70"
                >
                  Refresh
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-950/55 to-orange-950/35 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <CircleAlert size={19} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-amber-200">
                  Before you send
                </h3>
                <p className="mt-1 text-xs leading-5 text-amber-100/75">
                  Double-check the recipient and amount. Avoid submitting
                  another transfer while an earlier result is uncertain.
                </p>
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={() => navigate("/transactions")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"
          >
            <ReceiptText size={17} />
            Transaction history
            <ArrowRight size={15} />
          </button>
        </motion.aside>
      </div>

      {/* Confirmation modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !transferLoading
              ) {
                setShowConfirmation(false);
              }
            }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirmation-title"
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, scale: 0.96, y: 15 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="my-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 via-cyan-600 to-violet-600 px-5 py-4 text-white">
                <div>
                  <h2
                    id="confirmation-title"
                    className="font-bold"
                  >
                    Confirm transfer
                  </h2>
                  <p className="mt-1 text-xs text-sky-100">
                    Review before sending
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Close confirmation"
                  disabled={transferLoading}
                  onClick={() => setShowConfirmation(false)}
                  className="rounded-lg p-2 transition hover:bg-white/15 disabled:opacity-70"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div className="py-2 text-center">
                  <p className="text-xs text-slate-300">You are sending</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {money(form.amount)}
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <UserRound size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-emerald-900">
                      {receiver?.fullName}
                    </p>
                    <p className="mt-1 text-xs text-emerald-800">
                      {receiver?.maskedPhone}
                    </p>
                    <p className="mt-1 text-xs text-emerald-800">
                      Account: {receiver?.maskedAccountNumber}
                    </p>
                  </div>

                  <CheckCircle2
                    size={20}
                    className="shrink-0 text-emerald-600"
                  />
                </div>

                <div className="space-y-3 rounded-xl bg-slate-50 p-4">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-300">Amount</span>
                    <span className="font-semibold text-slate-900">
                      {money(form.amount)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-300">Description</span>
                    <span className="max-w-[65%] break-words text-right font-medium text-slate-800">
                      {form.description.trim() || "No description"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  <LockKeyhole size={16} className="mt-0.5 shrink-0" />
                  Confirm only if the recipient and amount are correct.
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={transferLoading}
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-70"
                  >
                    Go back
                  </button>

                  <button
                    type="button"
                    disabled={transferLoading || !receiver}
                    onClick={confirmTransfer}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400 px-4 py-3 text-sm font-bold text-white transition hover:shadow-lg disabled:opacity-70"
                  >
                    {transferLoading ? (
                      <>
                        <LoaderCircle size={17} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowRight size={17} />
                        Confirm & send
                      </>
                    )}
                  </button>
                </div>

                {transferLoading && (
                  <p
                    role="status"
                    aria-live="polite"
                    className="flex items-center justify-center gap-2 text-xs text-blue-700"
                  >
                    <LoaderCircle size={14} className="animate-spin" />
                    Waiting for the transaction result...
                  </p>
                )}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction result */}
      <AnimatePresence>
        {receipt && statusDetails && currentStatusStyles && (
          <motion.div
            key="receipt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="receipt-title"
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, y: 14, scale: 0.97 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              className="my-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div
                className={`border-b px-5 py-6 text-center ${currentStatusStyles.panel}`}
              >
                <motion.div
                  initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 240,
                    damping: 16,
                  }}
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${currentStatusStyles.icon}`}
                >
                  <statusDetails.Icon size={34} />
                </motion.div>

                <h2
                  id="receipt-title"
                  className="mt-4 text-xl font-bold text-slate-900"
                >
                  {statusDetails.title}
                </h2>

                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-300">
                  {statusDetails.description}
                </p>

                <span
                  className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${currentStatusStyles.badge}`}
                >
                  {statusDetails.label}
                </span>
              </div>

              <div className="space-y-4 p-5">
                <div className="text-center">
                  <p className="text-xs text-slate-300">Transfer amount</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {money(receipt.amount)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                      <UserRound size={21} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {receipt.receiverName || "Recipient"}
                      </p>
                      <p className="mt-1 text-xs text-slate-300">
                        {receipt.receiverPhone || "Phone not provided"}
                      </p>
                      {receipt.receiverAccount && (
                        <p className="mt-1 text-xs text-slate-300">
                          Account: {receipt.receiverAccount}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <span className="shrink-0 text-slate-300">Reference</span>
                    <span className="break-all text-right font-semibold text-slate-800">
                      {reference || "Not provided"}
                    </span>
                  </div>

                  {reference && (
                    <button
                      type="button"
                      onClick={() =>
                        copyText(reference, "Transaction reference copied.")
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
                    >
                      <Copy size={15} />
                      Copy reference
                    </button>
                  )}

                  <div className="flex justify-between gap-3 text-xs">
                    <span className="text-slate-300">Date</span>
                    <span className="text-right font-medium text-slate-800">
                      {formatDate(receipt.completedAt || receipt.createdAt)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-xs">
                    <span className="text-slate-300">Currency</span>
                    <span className="font-medium text-slate-800">
                      {receipt.currency || "INR"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-xs">
                    <span className="text-slate-300">Description</span>
                    <span className="max-w-[65%] break-words text-right font-medium text-slate-800">
                      {receipt.description || "No description"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-dashed border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={printReceipt}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Printer size={16} />
                    Print receipt
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReceipt(null);
                      navigate("/transactions");
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ReceiptText size={16} />
                    View history
                  </button>
                </div>

                <button
                  type="button"
                  onClick={startAnotherTransfer}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400 px-4 py-3 text-sm font-bold text-white transition hover:shadow-lg"
                >
                  <ArrowRightLeft size={17} />
                  New transfer
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TransferPage;

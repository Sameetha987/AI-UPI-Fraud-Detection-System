import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
  Phone,
  ReceiptText,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";

const initialForm = {
  phone: "",
  amount: "",
  description: "",
};

function maskPhone(phone) {
  if (!phone) return "";
  return `******${phone.slice(-4)}`;
}

function TransferPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [receiver, setReceiver] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Keep the same idempotency key when retrying the same payment.
  const [idempotencyKey, setIdempotencyKey] = useState(null);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (name === "phone") {
      setReceiver(null);
      setShowConfirmation(false);
    }

    // Changing payment details creates a new logical payment.
    if (name === "amount" || name === "description") {
      setIdempotencyKey(null);
      setShowConfirmation(false);
    }

    setReceipt(null);
  }

  async function findReceiver(event) {
    event.preventDefault();

    const phone = form.phone.trim();

    if (!/^\d{10}$/.test(phone)) {
      toast.error("Enter a valid 10-digit phone number.");
      return;
    }

    setLookupLoading(true);
    setReceiver(null);
    setReceipt(null);
    setShowConfirmation(false);

    try {
      const response = await api.get("/api/users/lookup", {
        params: { phone },
      });

      const data = response.data;

      if (
        !data?.fullName ||
        !data?.maskedPhone ||
        !data?.maskedAccountNumber
      ) {
        throw new Error("The receiver details returned by the server are incomplete.");
      }

      setReceiver(data);
      setIdempotencyKey(null);
      toast.success("Receiver found successfully.");
    } catch (error) {
      setReceiver(null);

      const status = error.response?.status;

      if (status === 401 || status === 403) {
        toast.error("Your session may have expired. Please log in again.");
      } else if (status === 404 || status === 400) {
        toast.error(
          error.response?.data?.message ||
            "No eligible SafePay receiver was found.",
        );
      } else {
        toast.error(
          error.response?.data?.message ||
            "Unable to find the receiver. Please try again.",
        );
      }
    } finally {
      setLookupLoading(false);
    }
  }

  function validatePayment() {
    if (!receiver) {
      toast.error("Find and confirm a receiver first.");
      return false;
    }

    const amountText = form.amount.trim();

    // Require a positive INR amount with no more than two decimal places.
    if (!/^\d+(\.\d{1,2})?$/.test(amountText)) {
      toast.error("Enter a valid amount with up to two decimal places.");
      return false;
    }

    const amount = Number(amountText);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Transfer amount must be greater than zero.");
      return false;
    }

    if (amount > 9999999999999999) {
      toast.error("The amount is too large.");
      return false;
    }

    if (form.description.length > 255) {
      toast.error("Description cannot exceed 255 characters.");
      return false;
    }

    return true;
  }

  function openConfirmation(event) {
    event.preventDefault();

    if (!validatePayment()) return;

    if (!idempotencyKey) {
      setIdempotencyKey(crypto.randomUUID());
    }

    setShowConfirmation(true);
  }

  async function confirmTransfer() {
    if (transferLoading || !receiver) return;

    if (!validatePayment()) {
      setShowConfirmation(false);
      return;
    }

    // A retry must use the same key as the original request.
    const requestKey = idempotencyKey || crypto.randomUUID();

    if (!idempotencyKey) {
      setIdempotencyKey(requestKey);
    }

    setTransferLoading(true);

    try {
      /*
       * The lookup response deliberately does not expose the full account
       * number. Resolve it securely on the backend using the phone number,
       * or use a server-issued receiver identifier in the transfer request.
       *
       * Do not attempt to construct a full account number from its mask.
       */
      const response = await api.post("/api/transactions/transfer", {
        receiverPhone: form.phone.trim(),
        amount: Number(form.amount),
        currency: "INR",
        description: form.description.trim(),
        idempotencyKey: requestKey,
      });

      setReceipt(response.data);
      setShowConfirmation(false);
      setForm(initialForm);
      setReceiver(null);
      setIdempotencyKey(null);

      toast.success("Transfer request processed.");
    } catch (error) {
        const status = error.response?.status;
        const data = error.response?.data;

        let message =
          "The transfer result could not be confirmed. Check your transaction history before retrying.";

        if (typeof data === "string" && data.trim()) {
          message = data;
        } else if (typeof data?.message === "string" && data.message.trim()) {
          message = data.message;
        } else if (
          typeof data?.detail === "string" &&
          data.detail.trim()
        ) {
          message = data.detail;
        } else if (status === 400) {
          message = "Transfer rejected. Check the amount and payment details.";
        } else if (status === 401 || status === 403) {
          message = "Your session expired. Please log in again.";
        } else if (status >= 500 || !error.response) {
          message =
            "The transfer result could not be confirmed. Check transaction history before retrying.";
        }

        toast.error(message);

        // Preserve the idempotency key after an uncertain result.
        // Do not automatically retry a payment.
    } finally {
      setTransferLoading(false);
    }
  }

  function startAnotherTransfer() {
    setForm(initialForm);
    setReceiver(null);
    setReceipt(null);
    setShowConfirmation(false);
    setIdempotencyKey(null);
  }

  if (receipt) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center sm:p-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10">
            <CheckCircle2 className="text-emerald-300" size={34} />
          </div>

          <h1 className="text-2xl font-bold">Transfer response received</h1>
          <p className="mt-2 text-sm text-slate-400">
            Check the transaction status below before treating this payment as
            completed.
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-left">
            <p className="text-sm text-slate-400">Amount</p>
            <p className="mt-1 text-3xl font-bold">
              ₹{Number(receipt.amount ?? form.amount ?? 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>

            <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
              <span className="text-sm text-slate-400">Status</span>
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-sm text-cyan-300">
                {receipt.status || "Unknown"}
              </span>
            </div>

            <div className="mt-4 flex items-start justify-between gap-4">
              <span className="text-sm text-slate-400">Reference</span>
              <span className="break-all text-right text-sm font-medium">
                {receipt.transactionReference || "Not provided"}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => navigate("/transactions")}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              <ReceiptText size={18} />
              View transactions
            </button>

            <button
              onClick={startAnotherTransfer}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 font-semibold transition hover:bg-white/5"
            >
              <ArrowRightLeft size={18} />
              New transfer
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-8">
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-cyan-300">
          <ShieldCheck size={17} />
          Secure payments
        </p>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Transfer Money
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          Find a SafePay recipient using their registered phone number, verify
          the details, and confirm your payment.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-8">
          <form onSubmit={openConfirmation} className="space-y-7">
            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Receiver's phone number
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Phone
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    placeholder="Enter 10-digit number"
                    value={form.phone}
                    onChange={updateField}
                    disabled={lookupLoading || transferLoading}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 py-3.5 pl-11 pr-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 disabled:opacity-60"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={findReceiver}
                  disabled={lookupLoading || transferLoading}
                  className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 px-5 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {lookupLoading ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <UserRound size={18} />
                  )}
                  Find receiver
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                The receiver must have an eligible SafePay account.
              </p>
            </div>

            {receiver && (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-400/10">
                    <UserRound className="text-emerald-300" size={23} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words font-semibold">
                        {receiver.fullName}
                      </h2>
                      <CheckCircle2
                        size={16}
                        className="text-emerald-300"
                      />
                    </div>

                    <p className="mt-1 text-sm text-slate-400">
                      {receiver.maskedPhone}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      Account ending in{" "}
                      {receiver.maskedAccountNumber.slice(-4)}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-400">
                  Verify the recipient before sending money. A name match alone
                  does not establish identity.
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="amount"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Amount (INR)
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-500">
                  ₹
                </span>

                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  max="9999999999999999"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={updateField}
                  disabled={transferLoading}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 py-4 pl-10 pr-4 text-2xl font-semibold text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-400/60 disabled:opacity-60"
                  required
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-slate-200"
                >
                  Payment description
                </label>

                <span className="text-xs text-slate-500">
                  {form.description.length}/255
                </span>
              </div>

              <input
                id="description"
                name="description"
                type="text"
                maxLength={255}
                placeholder="e.g. Lunch payment"
                value={form.description}
                onChange={updateField}
                disabled={transferLoading}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={!receiver || transferLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 px-5 py-4 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Review payment
              <ArrowRight size={19} />
            </button>
          </form>
        </div>

        <aside className="space-y-5">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10">
              <ShieldCheck className="text-cyan-300" size={23} />
            </div>

            <h2 className="font-semibold">Payment safety</h2>

            <ul className="mt-4 space-y-3 text-sm leading-5 text-slate-400">
              <li className="flex gap-2">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-cyan-300" />
                Verify the receiver before confirming.
              </li>
              <li className="flex gap-2">
                <LockKeyhole size={17} className="mt-0.5 shrink-0 text-cyan-300" />
                Requests use your authenticated session.
              </li>
              <li className="flex gap-2">
                <CircleAlert size={17} className="mt-0.5 shrink-0 text-cyan-300" />
                Never share your password or authentication token.
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-400/10">
              <Wallet className="text-blue-300" size={22} />
            </div>

            <h2 className="font-semibold">Before you transfer</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Check the recipient and amount carefully. The backend remains
              responsible for validating account status, balance, and payment
              rules.
            </p>
          </div>
        </aside>
      </div>

      {showConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !transferLoading
            ) {
              setShowConfirmation(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-title"
            className="my-auto w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10">
              <ArrowRightLeft className="text-cyan-300" size={24} />
            </div>

            <h2 id="confirmation-title" className="text-2xl font-bold">
              Confirm payment
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Review the payment details carefully before proceeding.
            </p>

            <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <div>
                <p className="text-xs text-slate-500">Sending to</p>
                <p className="mt-1 font-semibold">{receiver?.fullName}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {receiver?.maskedPhone}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Account ending in{" "}
                  {receiver?.maskedAccountNumber.slice(-4)}
                </p>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-xs text-slate-500">Transfer amount</p>
                <p className="mt-1 text-3xl font-bold">
                  ₹
                  {Number(form.amount).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              {form.description.trim() && (
                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs text-slate-500">Description</p>
                  <p className="mt-1 break-words text-sm">
                    {form.description.trim()}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={transferLoading}
                onClick={() => setShowConfirmation(false)}
                className="flex-1 rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                Go back
              </button>

              <button
                type="button"
                disabled={transferLoading}
                onClick={confirmTransfer}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {transferLoading ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <LockKeyhole size={17} />
                    Confirm & Transfer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default TransferPage;
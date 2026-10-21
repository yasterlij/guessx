import {
  Building2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  Minus,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { CURRENCY, formatCurrency } from "../mockDataV0";

type PaymentMethod = "SIKINAPAY" | "AWASH";

export function ProductPurchasePanel({
  bidValue,
  bidFlash,
  bidError,
  onBidChange,
  onBidBlur,
  onBidKeyDown,
  onDecrease,
  onIncrease,
  selectedPaymentMethod,
  showPaymentMethods,
  onTogglePaymentMethods,
  onSelectPaymentMethod,
  loadingMethod,
  checkingPin,
  walletBalance,
  bidFee,
  hasValidBid,
  authError,
  isEnding,
  isAdmin,
  onSubmit,
}: {
  bidValue: string;
  bidFlash: boolean;
  bidError: string | null;
  onBidChange: (value: string) => void;
  onBidBlur: () => void;
  onBidKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onDecrease: () => void;
  onIncrease: () => void;
  selectedPaymentMethod: PaymentMethod;
  showPaymentMethods: boolean;
  onTogglePaymentMethods: () => void;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  loadingMethod: PaymentMethod | null;
  checkingPin: boolean;
  walletBalance: number;
  bidFee: number;
  hasValidBid: boolean;
  authError: string | null;
  isEnding: boolean;
  isAdmin?: boolean;
  onSubmit: (method: PaymentMethod) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-white shadow-[0_24px_80px_rgba(0,43,92,0.08)]">
      <div className="border-t border-border/50 bg-gradient-to-br from-white via-white to-awash-blue/5 p-5 sm:p-6">
        <div className="space-y-5">
          <section className="rounded-[1.75rem] bg-gradient-to-r from-awash-blue via-awash-blue-dark to-awash-gold-dark p-3.5 text-white shadow-[0_18px_40px_rgba(0,43,92,0.16)]">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-white/72">
              Bid Amount
            </p>

            <div
              className={`mx-auto flex max-w-[19rem] items-center gap-2 rounded-[1.25rem] border border-white/12 bg-white/10 p-2 transition-all ${bidFlash ? "border-emerald-200 ring-2 ring-emerald-200/40" : ""}`}
            >
              <button
                type="button"
                onClick={onDecrease}
                disabled={Number(bidValue || 0) <= 1}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/90 text-awash-blue transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Decrease bid amount"
              >
                <Minus className="size-4" />
              </button>
              <div className="min-w-0 flex-1">
                <input
                  value={bidValue}
                  onChange={(e) => onBidChange(e.target.value)}
                  onBlur={onBidBlur}
                  onKeyDown={onBidKeyDown}
                  placeholder="0.00"
                  className="w-full border-0 bg-transparent text-center font-display text-[32px] font-extrabold tabular-nums text-white outline-none placeholder:text-white/45"
                />
                <p className="mt-0.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                  {CURRENCY}
                </p>
              </div>
              <button
                type="button"
                onClick={onIncrease}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/90 text-awash-blue transition-colors hover:bg-white"
                aria-label="Increase bid amount"
              >
                <Plus className="size-4" />
              </button>
            </div>
            {bidError ? (
              <p className="mt-2 text-xs font-semibold text-destructive">
                {bidError}
              </p>
            ) : null}
          </section>

          <section className="rounded-[1.75rem] bg-gradient-to-r from-awash-blue via-awash-blue-dark to-awash-gold-dark p-4 text-white shadow-[0_18px_40px_rgba(0,43,92,0.16)]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/72">
                Payment
              </p>
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={onTogglePaymentMethods}
                className="flex w-full items-center justify-between rounded-[1.25rem] border border-white/12 bg-white/10 px-4 py-3 text-left text-white transition-all hover:bg-white/15"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-10 items-center justify-center rounded-xl ${selectedPaymentMethod === "AWASH" ? "bg-white/15 text-awash-gold" : "bg-white/15 text-white"}`}
                  >
                    {selectedPaymentMethod === "AWASH" ? (
                      <Building2 className="size-5" />
                    ) : (
                      <ShieldCheck className="size-5" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {selectedPaymentMethod === "AWASH"
                        ? "Awash Wallet Pay"
                        : "SikinaPay"}
                    </p>
                    <p className="text-xs text-white/65">Select payment type</p>
                  </div>
                </div>
                {showPaymentMethods ? (
                  <ChevronUp className="size-4 text-white/65" />
                ) : (
                  <ChevronDown className="size-4 text-white/65" />
                )}
              </button>

              {showPaymentMethods && (
                <div className="mt-2 rounded-[1.25rem] border border-border/60 bg-white/80 p-2">
                  <button
                    type="button"
                    onClick={() => onSelectPaymentMethod("AWASH")}
                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${selectedPaymentMethod === "AWASH" ? "bg-awash-blue/10 ring-1 ring-awash-blue/20" : "hover:bg-neutral-50"}`}
                  >
                    <span
                      className={`flex size-10 items-center justify-center rounded-xl ${selectedPaymentMethod === "AWASH" ? "bg-awash-blue/10 text-awash-blue" : "bg-neutral-100 text-neutral-500"}`}
                    >
                      <Building2 className="size-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">
                        Awash Wallet Pay
                      </p>
                      <p className="text-xs text-neutral-500">
                        Pay from your wallet balance
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectPaymentMethod("SIKINAPAY")}
                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${selectedPaymentMethod === "SIKINAPAY" ? "bg-indigo-50 ring-1 ring-indigo-200" : "hover:bg-neutral-50"}`}
                  >
                    <span
                      className={`flex size-10 items-center justify-center rounded-xl ${selectedPaymentMethod === "SIKINAPAY" ? "bg-indigo-100 text-indigo-700" : "bg-neutral-100 text-neutral-500"}`}
                    >
                      <ShieldCheck className="size-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">
                        SikinaPay
                      </p>
                      <p className="text-xs text-neutral-500">
                        Mobile Money, USSD, or card
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-white/12 bg-white/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className={`flex items-center gap-2 ${selectedPaymentMethod === "AWASH" ? "text-awash-gold" : "text-white"}`}
                  >
                    {selectedPaymentMethod === "AWASH" ? (
                      <Wallet className="size-5" />
                    ) : (
                      <ShieldCheck className="size-5" />
                    )}
                    <span className="text-base font-bold">
                      {selectedPaymentMethod === "AWASH"
                        ? "Awash Wallet Pay"
                        : "SikinaPay"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-white/72">
                    {selectedPaymentMethod === "AWASH"
                      ? "Pay from your wallet balance after PIN confirmation."
                      : "Open the payment gateway and return automatically after confirmation."}
                  </p>
                </div>
                {selectedPaymentMethod === "AWASH" ? (
                  loadingMethod === "AWASH" || checkingPin ? (
                    <Loader2 className="size-5 animate-spin text-white" />
                  ) : (
                    <Lock className="size-5 text-white/70" />
                  )
                ) : loadingMethod === "SIKINAPAY" ? (
                  <Loader2 className="size-5 animate-spin text-white" />
                ) : null}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs font-semibold">
                <span className="text-white/60">
                  {selectedPaymentMethod === "AWASH" ? "Balance" : "Supports"}
                </span>
                <span
                  className={
                    selectedPaymentMethod === "AWASH"
                      ? walletBalance < bidFee
                        ? "text-red-200"
                        : "text-white"
                      : "text-white/72"
                  }
                >
                  {selectedPaymentMethod === "AWASH"
                    ? formatCurrency(walletBalance)
                    : "Mobile Money, USSD, card"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSubmit(selectedPaymentMethod)}
              disabled={
                isAdmin ||
                !hasValidBid ||
                checkingPin ||
                (selectedPaymentMethod === "AWASH" &&
                  (loadingMethod === "SIKINAPAY" || walletBalance < bidFee)) ||
                (selectedPaymentMethod === "SIKINAPAY" &&
                  loadingMethod === "AWASH")
              }
              className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAdmin ? (
                <>
                  <ShieldAlert className="size-4 text-red-300" />
                  Bidding Restricted (Admin)
                </>
              ) : selectedPaymentMethod === "AWASH" ? (
                loadingMethod === "AWASH" || checkingPin ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wallet className="size-4" />
                )
              ) : loadingMethod === "SIKINAPAY" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              {!isAdmin &&
                (selectedPaymentMethod === "AWASH"
                  ? "Pay Fee with Awash Wallet"
                  : "Pay Fee with SikinaPay")}
            </button>

            {isAdmin && (
              <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
                <ShieldAlert className="size-4 shrink-0 text-red-600" />
                <span>Administrators are not allowed to participate in bidding.</span>
              </div>
            )}

            {!isAdmin && walletBalance < bidFee && (
              <p className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive">
                Awash Wallet balance is below the bid amount. Use SikinaPay or
                top up your wallet.
              </p>
            )}
            {authError && (
              <p className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive">
                {authError}
              </p>
            )}
          </section>

          {isEnding ? (
            <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              Place your bid before the timer ends.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

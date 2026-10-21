import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, X, TicketCheck, MessageSquareText, ArrowRight } from "lucide-react";
import { useApp } from "../AppContext";
import { formatCurrency } from "../mockDataV0";

export function BidConfirmedModal() {
  const { bidSuccessModal, closeBidSuccessModal, go } = useApp();

  useEffect(() => {
    if (!bidSuccessModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeBidSuccessModal();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [bidSuccessModal, closeBidSuccessModal]);

  if (!bidSuccessModal) return null;

  const { auctionName, amount, ticket } = bidSuccessModal;

  return createPortal(
    <div
      onClick={closeBidSuccessModal}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-amber-300/40 bg-white p-6 shadow-2xl relative animate-in zoom-in-95 duration-200"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-sm">
              <Check className="size-6 stroke-[3]" />
            </div>
            <div>
              <h3 className="font-display text-xl font-extrabold text-slate-900">
                Bid Submitted Successfully!
              </h3>
              <p className="mt-0.5 text-xs font-medium text-neutral-500">
                Your bid is officially recorded in this auction.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeBidSuccessModal}
            className="rounded-full bg-neutral-100 p-1.5 text-neutral-500 hover:bg-neutral-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Item</p>
              <p className="mt-0.5 text-base font-bold text-slate-900 truncate">
                {auctionName}
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              Recorded ✓
            </span>
          </div>

          <div className="h-px bg-neutral-200/60" />

          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-neutral-500">Your Bid Amount:</span>
            <span className="text-2xl font-black text-emerald-600 tabular-nums">
              {formatCurrency(amount)}
            </span>
          </div>

          {ticket && (
            <>
              <div className="h-px bg-neutral-200/60" />
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium text-neutral-500">Ticket Number:</span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-mono font-bold text-amber-400">
                  <TicketCheck className="size-3.5 text-amber-400" />
                  {ticket}
                </span>
              </div>
            </>
          )}

          <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 p-3 text-left">
            <div className="flex items-start gap-2">
              <MessageSquareText className="size-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium leading-relaxed text-amber-900">
                SMS confirmation sent to your phone. Lowest unique bid wins!
              </p>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-neutral-500 pt-0.5">
            Keep watching — you might be the lowest unique bidder when the countdown ends.
          </p>
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() => {
              closeBidSuccessModal();
              go("my-bids");
            }}
            className="flex-1 rounded-xl border border-neutral-200 bg-neutral-100 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            View My Bids
          </button>
          <button
            type="button"
            onClick={closeBidSuccessModal}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-xs font-bold text-white shadow-md hover:from-amber-600 hover:to-amber-700 transition-all cursor-pointer"
          >
            <span>Continue Bidding</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

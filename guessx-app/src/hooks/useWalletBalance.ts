import { useState, useCallback } from "react";
import { api } from "../api";

interface UseWalletBalanceOptions {
  onError?: (message: string) => void;
}

export function useWalletBalance({ onError }: UseWalletBalanceOptions = {}) {
  const [walletBalance, setWalletBalance] = useState(0);

  const refreshWallet = useCallback(async () => {
    try {
      const res = await api.wallet.balance();
      setWalletBalance(res.balance);
    } catch {
      onError?.("Failed to fetch wallet balance");
    }
  }, [onError]);

  return { walletBalance, setWalletBalance, refreshWallet };
}

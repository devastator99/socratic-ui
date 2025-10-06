import React, { createContext, useContext, useState, useCallback } from 'react';

export interface SolanaTx {
  sig: string;
  amount: number; // in SOL lamports simplified (1 = 1 SOL for demo)
  date: Date;
}

interface RewardsContextValue {
  points: number;
  transactions: SolanaTx[];
  addPoints: (amt: number) => void;
  addTransaction: (tx: SolanaTx) => void;
}

const RewardsContext = createContext<RewardsContextValue | undefined>(undefined);

export const RewardsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [points, setPoints] = useState(0);
  const [transactions, setTransactions] = useState<SolanaTx[]>([]);

  const addPoints = useCallback((amt: number) => {
    setPoints((p) => p + amt);
  }, []);

  const addTransaction = useCallback((tx: SolanaTx) => {
    setTransactions((txs) => [tx, ...txs]);
  }, []);

  return (
    <RewardsContext.Provider value={{ points, transactions, addPoints, addTransaction }}>
      {children}
    </RewardsContext.Provider>
  );
};

export function useRewards() {
  const ctx = useContext(RewardsContext);
  if (!ctx) throw new Error('useRewards must be within RewardsProvider');
  return ctx;
} 
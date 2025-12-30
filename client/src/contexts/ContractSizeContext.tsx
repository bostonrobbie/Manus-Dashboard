import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type ContractSize = "mini" | "micro";

interface ContractSizeContextType {
  contractSize: ContractSize;
  setContractSize: (size: ContractSize) => void;
  toggleContractSize: () => void;
  contractMultiplier: number;
}

const STORAGE_KEY = "sts-contract-size";

const ContractSizeContext = createContext<ContractSizeContextType | undefined>(
  undefined
);

export function ContractSizeProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage or default to 'mini'
  const [contractSize, setContractSizeState] = useState<ContractSize>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "mini" || stored === "micro") {
        return stored;
      }
    }
    return "mini";
  });

  // Persist to localStorage when changed
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, contractSize);
  }, [contractSize]);

  const setContractSize = (size: ContractSize) => {
    setContractSizeState(size);
  };

  const toggleContractSize = () => {
    setContractSizeState(prev => (prev === "mini" ? "micro" : "mini"));
  };

  // Contract size multiplier: micro = 1/10 of mini
  const contractMultiplier = contractSize === "micro" ? 0.1 : 1;

  return (
    <ContractSizeContext.Provider
      value={{
        contractSize,
        setContractSize,
        toggleContractSize,
        contractMultiplier,
      }}
    >
      {children}
    </ContractSizeContext.Provider>
  );
}

export function useContractSize() {
  const context = useContext(ContractSizeContext);
  if (context === undefined) {
    throw new Error(
      "useContractSize must be used within a ContractSizeProvider"
    );
  }
  return context;
}

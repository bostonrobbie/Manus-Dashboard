import { createContext, useContext, useState, ReactNode } from 'react';

export type ContractSize = 'mini' | 'micro';

interface ContractSizeContextType {
  contractSize: ContractSize;
  setContractSize: (size: ContractSize) => void;
  toggleContractSize: () => void;
}

const ContractSizeContext = createContext<ContractSizeContextType | undefined>(undefined);

export function ContractSizeProvider({ children }: { children: ReactNode }) {
  const [contractSize, setContractSize] = useState<ContractSize>('mini');

  const toggleContractSize = () => {
    setContractSize((prev) => (prev === 'mini' ? 'micro' : 'mini'));
  };

  return (
    <ContractSizeContext.Provider value={{ contractSize, setContractSize, toggleContractSize }}>
      {children}
    </ContractSizeContext.Provider>
  );
}

export function useContractSize() {
  const context = useContext(ContractSizeContext);
  if (context === undefined) {
    throw new Error('useContractSize must be used within a ContractSizeProvider');
  }
  return context;
}

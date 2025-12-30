import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface AccountValueContextType {
  startingCapital: number;
  startingCapitalInput: string;
  setStartingCapitalInput: (value: string) => void;
  isLoading: boolean;
  isSaving: boolean;
}

const AccountValueContext = createContext<AccountValueContextType | undefined>(
  undefined
);

export function AccountValueProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [startingCapital, setStartingCapital] = useState(100000);
  const [startingCapitalInput, setStartingCapitalInputState] =
    useState("100000");
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch user's saved starting capital
  const { data: userData, isLoading: userDataLoading } =
    trpc.user.getStartingCapital.useQuery(undefined, {
      enabled: !!user && !authLoading,
    });

  // Mutation to save starting capital
  const saveCapitalMutation = trpc.user.setStartingCapital.useMutation();

  // Initialize from database when user data loads
  useEffect(() => {
    if (userData?.startingCapital && !isInitialized) {
      setStartingCapital(userData.startingCapital);
      setStartingCapitalInputState(userData.startingCapital.toString());
      setIsInitialized(true);
    }
  }, [userData, isInitialized]);

  // Debounce and save starting capital changes
  useEffect(() => {
    const value = Number(startingCapitalInput);
    if (isNaN(value) || value <= 0) return;

    const timer = setTimeout(() => {
      if (value !== startingCapital) {
        setStartingCapital(value);

        // Save to database if user is logged in
        if (user) {
          saveCapitalMutation.mutate({ startingCapital: value });
        }
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [startingCapitalInput, startingCapital, user]);

  const setStartingCapitalInput = useCallback((value: string) => {
    setStartingCapitalInputState(value);
  }, []);

  const isLoading = authLoading || userDataLoading;
  const isSaving = saveCapitalMutation.isPending;

  return (
    <AccountValueContext.Provider
      value={{
        startingCapital,
        startingCapitalInput,
        setStartingCapitalInput,
        isLoading,
        isSaving,
      }}
    >
      {children}
    </AccountValueContext.Provider>
  );
}

export function useAccountValue() {
  const context = useContext(AccountValueContext);
  if (context === undefined) {
    throw new Error(
      "useAccountValue must be used within an AccountValueProvider"
    );
  }
  return context;
}

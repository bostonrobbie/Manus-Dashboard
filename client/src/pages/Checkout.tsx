import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function Checkout() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  // Get URL params
  const urlParams = new URLSearchParams(window.location.search);
  const priceId = urlParams.get("priceId");
  const interval =
    (urlParams.get("interval") as "monthly" | "yearly") || "monthly";

  const createCheckout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: data => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Failed to create checkout session");
      }
    },
    onError: err => {
      setError(err.message || "Failed to create checkout session");
    },
  });

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      // Store the intended destination
      sessionStorage.setItem("checkoutRedirect", window.location.href);
      window.location.href = getLoginUrl();
      return;
    }

    // Create checkout session
    if (!createCheckout.isPending && !createCheckout.isSuccess && !error) {
      createCheckout.mutate({
        priceId: priceId || undefined,
        interval,
      });
    }
  }, [isAuthenticated, authLoading, priceId, interval]);

  if (authLoading || createCheckout.isPending) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-400">Redirecting to checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-400 mb-2">
              Checkout Error
            </h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => setLocation("/")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

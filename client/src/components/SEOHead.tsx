import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  noindex?: boolean;
}

/**
 * SEOHead - Dynamic meta tag management for React SPA
 * Updates document head with page-specific SEO tags
 */
export function SEOHead({
  title,
  description,
  canonical,
  ogImage = "https://stsdashboard.com/portfolio-preview.webp",
  ogType = "website",
  noindex = false,
}: SEOHeadProps) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper to update or create meta tag
    const setMetaTag = (selector: string, attribute: string, value: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement("meta");
        if (selector.includes("property=")) {
          element.setAttribute(
            "property",
            selector.match(/property="([^"]+)"/)?.[1] || ""
          );
        } else if (selector.includes("name=")) {
          element.setAttribute(
            "name",
            selector.match(/name="([^"]+)"/)?.[1] || ""
          );
        }
        document.head.appendChild(element);
      }
      element.setAttribute(attribute, value);
    };

    // Helper to update or create link tag
    const setLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement("link");
        element.setAttribute("rel", rel);
        document.head.appendChild(element);
      }
      element.setAttribute("href", href);
    };

    // Update meta description
    setMetaTag('meta[name="description"]', "content", description);
    setMetaTag('meta[name="title"]', "content", title);

    // Update robots if noindex
    if (noindex) {
      setMetaTag('meta[name="robots"]', "content", "noindex, nofollow");
    }

    // Update Open Graph tags
    setMetaTag('meta[property="og:title"]', "content", title);
    setMetaTag('meta[property="og:description"]', "content", description);
    setMetaTag('meta[property="og:type"]', "content", ogType);
    setMetaTag('meta[property="og:image"]', "content", ogImage);
    if (canonical) {
      setMetaTag('meta[property="og:url"]', "content", canonical);
    }

    // Update Twitter Card tags
    setMetaTag('meta[name="twitter:title"]', "content", title);
    setMetaTag('meta[name="twitter:description"]', "content", description);
    setMetaTag('meta[name="twitter:image"]', "content", ogImage);

    // Update canonical URL
    if (canonical) {
      setLinkTag("canonical", canonical);
    }

    // Cleanup function to reset to defaults when component unmounts
    return () => {
      // Reset to default values on unmount (optional)
    };
  }, [title, description, canonical, ogImage, ogType, noindex]);

  return null; // This component doesn't render anything
}

// Pre-defined SEO configurations for each page
export const SEO_CONFIG = {
  home: {
    title: "STS Futures | Systematic Trading Strategies Platform",
    description:
      "8 backtested futures strategies with 15+ years of data. Real-time TradingView signals and automated execution for ES, NQ, CL, GC, BTC futures. Start your free trial.",
    canonical: "https://stsdashboard.com/",
  },
  overview: {
    title: "Portfolio Overview | STS Futures Trading Dashboard",
    description:
      "Track your combined portfolio performance with real-time equity curves, Sharpe ratio, drawdown analysis, and comprehensive risk metrics across all futures strategies.",
    canonical: "https://stsdashboard.com/overview",
  },
  strategies: {
    title: "Trading Strategies | ES, NQ, CL, GC, BTC Futures | STS",
    description:
      "Explore 8 backtested futures trading strategies for ES, NQ, YM, CL, GC, and BTC. Compare performance metrics, equity curves, and risk-adjusted returns.",
    canonical: "https://stsdashboard.com/strategies",
  },
  compare: {
    title: "Compare Strategies | Portfolio Builder | STS Futures",
    description:
      "Build your optimal futures portfolio by comparing strategies side-by-side. Analyze correlations, combined equity curves, and diversification benefits.",
    canonical: "https://stsdashboard.com/compare",
  },
  myDashboard: {
    title: "My Dashboard | Personal Portfolio | STS Futures",
    description:
      "Your personalized futures trading dashboard. Track subscribed strategies, monitor real-time signals, and manage your portfolio performance.",
    canonical: "https://stsdashboard.com/my-dashboard",
  },
  brokerSetup: {
    title: "Broker Setup | Auto-Execute Trades | STS Futures",
    description:
      "Connect your brokerage account for automated trade execution. Supports Tradovate, Interactive Brokers, and paper trading for risk-free testing.",
    canonical: "https://stsdashboard.com/broker-setup",
  },
  strategyDetail: (name: string, symbol: string) => ({
    title: `${name} Strategy | ${symbol} Futures Performance | STS`,
    description: `Detailed performance analysis for ${name} strategy trading ${symbol} futures. View equity curve, trade history, drawdown analysis, and risk metrics.`,
    canonical: `https://stsdashboard.com/strategy/${symbol.toLowerCase()}`,
  }),
};

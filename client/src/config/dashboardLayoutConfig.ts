export type DashboardSectionId =
  | "portfolioSummary"
  | "portfolioEquity"
  | "strategyTable"
  | "strategyEquityGrid"
  | "alerts";

export interface DashboardSectionConfig {
  id: DashboardSectionId;
  title: string;
  componentKey: string;
  defaultOrder: number;
  defaultSize?: "full" | "half" | "third";
  visibleByDefault: boolean;
}

export const dashboardSections: DashboardSectionConfig[] = [
  {
    id: "portfolioSummary",
    title: "Portfolio summary",
    componentKey: "portfolioSummary",
    defaultOrder: 1,
    defaultSize: "full",
    visibleByDefault: true,
  },
  {
    id: "portfolioEquity",
    title: "Portfolio equity",
    componentKey: "portfolioEquity",
    defaultOrder: 2,
    defaultSize: "full",
    visibleByDefault: true,
  },
  {
    id: "strategyTable",
    title: "Strategies",
    componentKey: "strategyTable",
    defaultOrder: 3,
    defaultSize: "full",
    visibleByDefault: true,
  },
  {
    id: "strategyEquityGrid",
    title: "Strategy equity",
    componentKey: "strategyEquityGrid",
    defaultOrder: 4,
    defaultSize: "half",
    visibleByDefault: true,
  },
  {
    id: "alerts",
    title: "Attention",
    componentKey: "alerts",
    defaultOrder: 5,
    defaultSize: "half",
    visibleByDefault: true,
  },
];

// TODO: allow per-user layout overrides and drag/drop ordering once persistence is added.

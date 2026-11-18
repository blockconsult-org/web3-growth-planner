export const manifest = {
  id: "web3-growth-planner", practice: "web3", publicPath: "/tools/web3-growth-planner",
  schemaVersion: 1, methodologyVersion: 1,
  locales: {
    en: { title: "Web3 Growth & Incentive Planner", description: "Compare campaign channels, incentive budgets, activation and retention with explicit cohort assumptions." },
    de: { title: "Web3 Wachstums- & Anreizplaner", description: "Vergleichen Sie Kampagnenkanäle, Prämienbudgets, Aktivierung und Bindung mit ausdrücklichen Kohortenannahmen." },
  },
  relatedServicePaths: ["/services/outreach"], relatedArticlePaths: ["/blog/web3-retention-metrics"],
} as const;

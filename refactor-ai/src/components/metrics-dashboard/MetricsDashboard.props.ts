import type { MetricsComparison } from "../../types/api.types";


export interface MetricsDashboardProps {
  metrics: MetricsComparison | undefined;
}

export interface MetricCardProps {
  title: string;
  oldVal: number;
  newVal: number;
  inverse?: boolean; // True if "Higher is Better" (like Maintainability)
}
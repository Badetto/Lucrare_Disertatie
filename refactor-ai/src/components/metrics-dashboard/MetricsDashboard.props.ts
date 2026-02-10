import type { RefactorResponse } from "../../types/api.types";


export interface MetricsDashboardProps {
  response: RefactorResponse | null | undefined;
}

export interface MetricCardProps {
  title: string;
  oldVal: number;
  newVal: number;
  inverse?: boolean; // True if "Higher is Better" (like Maintainability)
}
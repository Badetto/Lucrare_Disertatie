import type { BenchmarkResult } from "../../types/api.types";

export interface BenchmarkDashboardProps {
    result: BenchmarkResult | null;
    isLoading: boolean;
}
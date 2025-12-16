import type { TranslateResult } from "./TranslateResult";

export interface Task {
  id: string;

  status: "queued" | "processing" | "done" | "error";

  progress: number;

  result: TranslateResult | null;

  error?: string | null;
}

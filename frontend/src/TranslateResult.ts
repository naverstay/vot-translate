export interface TranslateResult {
  status: string;
  translationId: string;
  translated: boolean;
  audioUrl: string;
  remainingTime: number;
  raw: unknown;
}

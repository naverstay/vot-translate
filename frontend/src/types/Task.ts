import type {TranslateResult} from "./TranslateResult";

export type TaskStatus = "queued" | "processing" | "done" | "error";

export interface Task {
  id: string;

  // Текущий статус задачи
  status: TaskStatus;

  // Прогресс от 0 до 100
  progress: number;

  // Результат, если задача завершена
  result: TranslateResult | null;

  // Ошибка, если задача завершилась неудачно
  error?: string;
}

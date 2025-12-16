import {useEffect, useRef} from "react";
import type {Task} from "./types/Task";

export function useTaskQueue(tasks: Task[], setTasks: (t: Task[]) => void) {
  // @ts-ignore
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Останавливаем старый интервал
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Если нет задач, нечего опрашивать
    if (tasks.length === 0) return;

    intervalRef.current = setInterval(async () => {
      const updatedTasks = await Promise.all(
        tasks.map(async (task) => {
          // Если задача уже завершена — не опрашиваем
          if (task.status === "done" || task.status === "error") {
            return task;
          }

          try {
            const res = await fetch(`http://localhost:3001/status/${task.id}`);
            if (!res.ok) {
              return {
                ...task,
                status: "error",
                error: `HTTP ${res.status}`,
              };
            }

            const data = await res.json();

            return {
              ...task,
              status: data.status,
              progress: data.progress,
              result: data.result ?? null,
              error: data.error ?? null,
            };
          } catch (err: any) {
            return {
              ...task,
              status: "error",
              error: err.message,
            };
          }
        })
      );

      setTasks(updatedTasks);
    }, 1500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tasks, setTasks]);
}

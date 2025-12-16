import {TaskItem} from "./TaskItem";
import type {Task} from "./types/Task";

interface Props {
  tasks: Task[];
  subtitleFormat: "srt" | "vtt" | "json";
}

export function TaskList({tasks, subtitleFormat}: Props) {
  if (!tasks || tasks.length === 0) {
    return <p style={{color: "#777"}}>Задач пока нет</p>;
  }

  // Новые задачи сверху
  const sorted = [...tasks].sort((a, b) => (a.id < b.id ? 1 : -1));

  return (
    <div style={{marginTop: 20}}>
      {sorted.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          subtitleFormat={subtitleFormat}
        />
      ))}
    </div>
  );
}

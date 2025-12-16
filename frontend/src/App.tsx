import { useEffect, useState } from "react";
import { languages } from "./languages";
import { TaskItem } from "./TaskItem";
import type { Task } from "./types/Task";

export default function App() {
  const [url, setUrl] = useState("https://youtu.be/EemY2GVMiqI?si=Mkec4-3lnX3_GuoN");
  const [requestLang, setRequestLang] = useState("en");
  const [responseLang, setResponseLang] = useState("ru");
  const [subtitleFormat, setSubtitleFormat] = useState<"srt" | "vtt" | "json">(
    "srt"
  );

  const [tasks, setTasks] = useState<Task[]>([]);

  const createTask = async () => {
    if (!url.trim()) return;

    const res = await fetch("http://localhost:3001/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, requestLang, responseLang })
    });

    const data = await res.json();

    if (data.error) {
      alert("Ошибка: " + data.error);
      return;
    }

    const newTask: Task = {
      id: data.taskId,
      status: "queued",
      progress: 0,
      result: null
    };

    setTasks((prev) => [...prev, newTask]);
  };

  // Пуллинг статусов
  useEffect(() => {
    if (tasks.length === 0) return;

    const interval = setInterval(async () => {
      const active = tasks.filter(
        (t) => t.status === "queued" || t.status === "processing"
      );

      if (active.length === 0) return;

      const updates = await Promise.all(
        active.map(async (t) => {
          const res = await fetch(`http://localhost:3001/status/${t.id}`);
          const data = await res.json();
          return { id: t.id, data };
        })
      );

      setTasks((current) =>
        current.map((t) => {
          const upd = updates.find((u) => u.id === t.id);
          if (!upd) return t;

          return {
            id: t.id,
            status: upd.data.status,
            progress: upd.data.progress ?? t.progress,
            result: upd.data.result ?? t.result,
            error: upd.data.error
          } as Task;
        })
      );
    }, 1500);

    return () => clearInterval(interval);
  }, [tasks]);

  return (
    <div style={{ padding: 40 }}>
      <h1>Перевод видео через vot.js</h1>

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="URL видео"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ width: 400, padding: 10 }}
        />
      </div>

      {url && (
        <div style={{ marginBottom: 20 }}>
          <h3>Предпросмотр</h3>
          <video src={url} controls width={400} />
        </div>
      )}

      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        <div>
          <label>Язык оригинала</label>
          <select
            value={requestLang}
            onChange={(e) => setRequestLang(e.target.value)}
            style={{ display: "block", padding: 8 }}
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Язык перевода</label>
          <select
            value={responseLang}
            onChange={(e) => setResponseLang(e.target.value)}
            style={{ display: "block", padding: 8 }}
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Формат субтитров</label>
          <select
            value={subtitleFormat}
            onChange={(e) =>
              setSubtitleFormat(e.target.value as "srt" | "vtt" | "json")
            }
            style={{ display: "block", padding: 8 }}
          >
            <option value="srt">SRT</option>
            <option value="vtt">VTT</option>
            <option value="json">JSON</option>
          </select>
        </div>
      </div>

      <button onClick={createTask}>Добавить в очередь</button>

      <h2 style={{ marginTop: 40 }}>Очередь задач</h2>

      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} subtitleFormat={subtitleFormat} />
      ))}
    </div>
  );
}

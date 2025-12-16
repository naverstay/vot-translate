import type {Task} from "./types/Task";

interface Props {
  task: Task;
  subtitleFormat: "srt" | "vtt" | "json";
}

export function TaskItem({task, subtitleFormat}: Props) {
  const hasSubtitles = !!task.result?.subtitles;

  const subtitles =
    hasSubtitles
      ? subtitleFormat === "srt"
        ? task.result!.subtitles.srt
        : subtitleFormat === "vtt"
          ? task.result!.subtitles.vtt
          : JSON.stringify(task.result!.subtitles.json, null, 2)
      : null;

  const downloadSubtitles = () => {
    if (!subtitles) return;

    const blob = new Blob([subtitles], {type: "text/plain"});
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `subtitles.${subtitleFormat}`;
    a.click();
  };

  return (
    <div style={{padding: 20, border: "1px solid #ccc", marginTop: 20}}>
      <h3>Задача {task.id}</h3>

      <p>
        <strong>Статус:</strong> {task.status}
      </p>

      <div
        style={{
          width: "100%",
          height: 10,
          background: "#eee",
          borderRadius: 5,
          overflow: "hidden",
          marginBottom: 10
        }}
      >
        <div
          style={{
            width: `${task.progress}%`,
            height: "100%",
            background: "#4caf50"
          }}
        />
      </div>

      {task.error && <p style={{color: "red"}}>{task.error}</p>}

      {task.result && (
        <>
          <pre style={{background: "#eee", padding: 20, whiteSpace: 'pre-wrap'}}>
            {JSON.stringify(task.result, null, 2)}
          </pre>

          <h4>Аудио</h4>
          <audio controls src={task.result.audioUrl}/>

          <h4>Итоговое видео</h4>
          {task.result.finalVideo ? (
            <>
              <video
                controls
                width={600}
                src={`http://localhost:3001${task.result.finalVideo}`}
              />
              <a
                href={`http://localhost:3001${task.result.finalVideo}`}
                download
                style={{display: "block", marginTop: 10}}
              >
                Скачать итоговое видео
              </a>
            </>
          ) : (
            <p style={{color: "#777"}}>
              Итоговое видео недоступно (нет субтитров)
            </p>
          )}

          <h4>Субтитры</h4>

          {hasSubtitles ? (
            <>
              <button onClick={downloadSubtitles}>Скачать субтитры</button>

              <pre
                style={{
                  background: "#eee",
                  padding: 20,
                  whiteSpace: "pre-wrap",
                  marginTop: 10
                }}
              >
                {subtitles}
              </pre>
            </>
          ) : (
            <p style={{color: "#777"}}>
              Субтитры недоступны для этого видео
            </p>
          )}
        </>
      )}
    </div>
  );
}

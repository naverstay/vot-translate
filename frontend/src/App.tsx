import {useState} from "react";
import type {TranslateResult} from "./TranslateResult";

export default function App() {
  const [url, setUrl] = useState("https://youtu.be/EemY2GVMiqI?si=Mkec4-3lnX3_GuoN");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<TranslateResult | null>(null);

  const handleTranslate = async () => {
    setStatus("Перевожу...");
    setResult(null);

    const res = await fetch("http://localhost:3001/translate", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({url})
    });

    const data = await res.json();

    if (data.error) {
      setStatus("Ошибка: " + data.error);
      return;
    }

    setStatus("Готово");
    setResult(data);
  };

  return (
    <div style={{padding: 40}}>
      <h1>Перевод видео через vot.js</h1>

      <input
        type="text"
        placeholder="URL видео"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{width: 400, padding: 10}}
      />

      <button onClick={handleTranslate} style={{marginLeft: 10}}>
        Перевести
      </button>

      <div style={{marginTop: 20}}>
        <strong>{status}</strong>
      </div>

      {result && (
        <div style={{marginTop: 20}}>
          <h3>Результат:</h3>

          <p><strong>ID:</strong> {result.translationId}</p>
          <p><strong>Статус:</strong> {result.translated ? "Готово" : "В процессе"}</p>

          <p>
            <strong>Аудио:</strong>{" "}
            <a href={result.audioUrl} target="_blank" rel="noreferrer">
              Скачать MP3
            </a>
          </p>

          <pre style={{background: "#eee", padding: 20, whiteSpace: 'pre-wrap'}}>
            {JSON.stringify(result.raw, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

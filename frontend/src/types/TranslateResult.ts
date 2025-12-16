export interface TranslateResult {
  translationId: string;
  audioUrl: string;

  // Все форматы субтитров
  subtitles: {
    srt: string;
    vtt: string;
    json: Array<{
      index: string;
      start: string;
      end: string;
      text: string;
    }>;
  };

  // Путь к итоговому видео (локальный путь, который отдаёт backend)
  finalVideo: string;

  // Полный ответ от vot.js
  raw: {
    translation: unknown;
    subtitlesResponse: unknown;
  };
}

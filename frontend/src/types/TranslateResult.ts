export interface TranslateResult {
  translationId: string;
  audioUrl: string;

  // Все форматы субтитров (или null, если их нет)
  subtitles: {
    srt: string;
    vtt: string;
    json: Array<{
      index: string;
      start: string;
      end: string;
      text: string;
    }>;
  } | null;

  // Путь к итоговому видео (или null, если не собрано)
  finalVideo: string | null;

  // Флаги состояния
  ffmpegNotInstalled: boolean;   // true → видео не собрано из-за отсутствия ffmpeg
  videoSourceMissing: boolean;   // true → воркер не дал videoUrl, видео собрать невозможно

  // Полный ответ от vot.js
  raw: {
    translation: unknown;
    subtitlesResponse: unknown;
    track?: unknown; // выбранная дорожка субтитров (если была)
  };
}

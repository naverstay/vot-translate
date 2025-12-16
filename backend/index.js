import express from "express";
import cors from "cors";
import {VOTWorkerClient} from "@vot.js/core";
import {randomUUID} from "crypto";
import fs from "fs";

import {srtToJson, srtToVtt} from "./utils/subtitles.js";
import {mergeAudioSubtitles, mergeAudioOnly, checkFFmpegInstalled} from "./utils/merge.js";

const SUBTITLES_RETRIES = 3;

// ================== БАЗА ==================

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json());

if (!fs.existsSync("tmp")) fs.mkdirSync("tmp");

const client = new VOTWorkerClient({
  hostVOT: "https://vot.toil.cc",
  apiToken: process.env.VOT_API_TOKEN || ""
});

const tasks = new Map();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}


// ================== ХЕЛПЕРЫ ==================

async function safeTranslateVideo(opts, attempts = 3) {
  let lastError = null;

  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await client.translateVideo(opts);
      console.log(
        `[translateVideo attempt ${i}/${attempts}] translated=${res.translated} status=${res.status}`
      );
      return res;
    } catch (err) {
      lastError = err;
      console.warn(
        `[translateVideo attempt ${i}/${attempts}] error:`,
        err.message
      );
      if (i < attempts) await sleep(1500);
    }
  }

  throw lastError;
}

async function tryFetchSubtitles({url, requestLang, responseLang, translationId}) {
  // ================================
  // 1) Попытка получить по translationId
  // ================================
  if (translationId) {
    for (let i = 1; i <= SUBTITLES_RETRIES; i++) {
      try {
        const subs = await client.getSubtitles({translationId});

        console.log(
          `[getSubtitles by translationId ${i}/${SUBTITLES_RETRIES}] waiting=${subs.waiting}, tracks=${
            subs.subtitles?.length ?? 0
          }`
        );

        if (!subs.waiting && subs.subtitles && subs.subtitles.length > 0) {
          const track =
            subs.subtitles.find((s) => s.translatedLanguage === responseLang) ||
            subs.subtitles.find((s) => s.language === requestLang) ||
            subs.subtitles[0];

          if (!track) return null;

          const subtitleUrl = track.translatedUrl || track.url;
          if (!subtitleUrl) return null;

          const resp = await fetch(subtitleUrl);
          if (!resp.ok) return null;

          const srt = await resp.text();
          if (!srt || srt.length < 5) return null;

          console.log("✅ Subtitles loaded via translationId");
          return {srt, track, subs};
        }
      } catch (err) {
        // воркер не поддерживает translationId → fallback
        console.log("⚠️ getSubtitles(translationId) not supported:", err.message);
        break;
      }

      await sleep(2000);
    }
  }

  // ================================
  // 2) Fallback: получение по URL
  // ================================
  console.log("↩️ Falling back to getSubtitles(videoData.url)");

  for (let i = 1; i <= SUBTITLES_RETRIES; i++) {
    const subs = await client.getSubtitles({
      videoData: {url},
      requestLang
    });

    console.log(
      `[getSubtitles by URL ${i}/${SUBTITLES_RETRIES}] waiting=${subs.waiting}, tracks=${
        subs.subtitles?.length ?? 0
      }`
    );

    if (!subs.waiting && subs.subtitles && subs.subtitles.length > 0) {
      const track =
        subs.subtitles.find((s) => s.translatedLanguage === responseLang) ||
        subs.subtitles.find((s) => s.language === requestLang) ||
        subs.subtitles[0];

      if (!track) return null;

      const subtitleUrl = track.translatedUrl || track.url;
      if (!subtitleUrl) return null;

      const resp = await fetch(subtitleUrl);
      if (!resp.ok) return null;

      const srt = await resp.text();
      if (!srt || srt.length < 5) return null;

      console.log("✅ Subtitles loaded via URL");
      return {srt, track, subs};
    }

    await sleep(2000);
  }

  console.log("⚠️ Subtitles not available (translationId + URL both failed)");
  return null;
}

// ================== API: СОЗДАНИЕ ЗАДАЧИ ==================

app.post("/translate", (req, res) => {
  const {url, requestLang, responseLang} = req.body;

  if (!url) {
    return res.status(400).json({error: "URL required"});
  }

  const taskId = randomUUID();

  tasks.set(taskId, {
    status: "queued",
    progress: 0,
    result: null
  });

  (async () => {
    try {
      const t = () => tasks.get(taskId);

      t().status = "processing";
      t().progress = 10;

      // 1) Перевод видео
      const translation = await safeTranslateVideo({
        videoData: {url},
        requestLang,
        responseLang
      });

      t().progress = 40;

      // 2) Субтитры (опционально)
      const subtitleData = await tryFetchSubtitles({
        url,
        requestLang,
        responseLang,
        translationId: translation.translationId
      });

      let subtitles = null;
      let subsPath = null;

      if (subtitleData) {
        const {srt} = subtitleData;

        subtitles = {
          srt,
          vtt: srtToVtt(srt),
          json: srtToJson(srt)
        };

        subsPath = `tmp/${taskId}.srt`;
        fs.writeFileSync(subsPath, srt, "utf8");

        t().progress = 70;
      } else {
        console.log("⚠️ Subtitles not available — continuing without them");
        t().progress = 70;
      }

      // 3) Проверяем наличие ffmpeg
      const ffmpegInstalled = await checkFFmpegInstalled();

      if (!ffmpegInstalled) {
        console.log("⚠️ FFmpeg not installed — skipping video merge");

        tasks.set(taskId, {
          status: "done",
          progress: 100,
          result: {
            translationId: translation.translationId,
            audioUrl: translation.url,
            subtitles,
            finalVideo: null,
            ffmpegNotInstalled: true,
            raw: {
              translation,
              subtitlesResponse: subtitleData?.subs ?? null,
              track: subtitleData?.track ?? null
            }
          }
        });

        return;
      }

      // 4) Сборка итогового видео (FFmpeg есть)
      const finalVideoPath = `tmp/${taskId}_final.mp4`;

      const videoSource =
        translation.videoUrl ||
        translation.originalVideoUrl ||
        translation.raw?.videoUrl ||
        translation.raw?.videoData?.url;

      if (!videoSource) {
        console.log("⚠️ VOT did not return a downloadable video URL — skipping video merge");

        tasks.set(taskId, {
          status: "done",
          progress: 100,
          result: {
            translationId: translation.translationId,
            audioUrl: translation.url,
            subtitles,
            finalVideo: null,
            videoSourceMissing: true,
            ffmpegNotInstalled: false,
            raw: {
              translation,
              subtitlesResponse: subtitleData?.subs ?? null,
              track: subtitleData?.track ?? null,
            },
          },
        });

        return;
      }

      if (subtitles) {
        await mergeAudioSubtitles(videoSource, translation.url, subsPath, finalVideoPath);
      } else {
        await mergeAudioOnly(videoSource, translation.url, finalVideoPath);
      }

      t().progress = 100;

      tasks.set(taskId, {
        status: "done",
        progress: 100,
        result: {
          translationId: translation.translationId,
          audioUrl: translation.url,
          subtitles,
          finalVideo: `/${finalVideoPath}`,
          ffmpegNotInstalled: false,
          raw: {
            translation,
            subtitlesResponse: subtitleData?.subs ?? null,
            track: subtitleData?.track ?? null
          }
        }
      });
    } catch (err) {
      console.error("Task error:", err);
      tasks.set(taskId, {
        status: "error",
        progress: 100,
        error: err.message
      });
    }
  })();

  res.json({taskId});
});

// ================== API: СТАТУС ЗАДАЧИ ==================

app.get("/status/:taskId", (req, res) => {
  const task = tasks.get(req.params.taskId);
  if (!task) {
    return res.status(404).json({error: "Task not found"});
  }
  res.json(task);
});

// ================== СТАТИКА ==================

app.use("/tmp", express.static("tmp"));

// ================== СТАРТ ==================

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});

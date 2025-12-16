import {exec} from "child_process";

export function checkFFmpegInstalled() {
  return new Promise((resolve) => {
    // 1) Проверяем через where (Windows)
    exec("where ffmpeg", (err, stdout) => {
      if (!err && stdout && stdout.includes(".exe")) {
        return resolve({installed: true, path: stdout.trim()});
      }

      // 2) Проверяем через ffmpeg -version
      exec("ffmpeg -version", (err2) => {
        if (!err2) {
          return resolve({installed: true, path: "ffmpeg (from PATH)"});
        }

        // 3) ffmpeg не найден
        resolve({installed: false});
      });
    });
  });
}

export function mergeAudioOnly(videoUrl, audioUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = `ffmpeg -y -i "${videoUrl}" -i "${audioUrl}" ` + `-map 0:v -map 1:a -c:v copy -c:a aac "${outputPath}"`;
    exec(cmd, (err) => {
      if (err) return reject(err);
      resolve(outputPath);
    });
  });
}

export function mergeAudioSubtitles(videoUrl, audioUrl, subtitlesPath, outputPath) {
  return new Promise((resolve, reject) => {
    // Важно: ffmpeg должен быть установлен в системе
    const cmd =
      `ffmpeg -y -i "${videoUrl}" -i "${audioUrl}" ` +
      `-vf subtitles="${subtitlesPath}" ` +
      `-c:v libx264 -c:a aac "${outputPath}"`;

    console.log("FFmpeg command:", cmd);

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("FFmpeg error:", err);
        console.error("FFmpeg stderr:", stderr);
        return reject(err);
      }
      console.log("FFmpeg done");
      resolve(outputPath);
    });
  });
}

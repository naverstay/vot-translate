import express from "express";
import cors from "cors";
import {VOTWorkerClient} from "@vot.js/core";

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const client = new VOTWorkerClient({
  hostVOT: "https://vot.toil.cc",
  apiToken: process.env.VOT_API_TOKEN || ""
});

app.post("/translate", async (req, res) => {
  const {url} = req.body;

  if (!url) {
    return res.status(400).json({error: "URL required"});
  }

  try {
    const result = await client.translateVideo({
      videoData: {url},
      requestLang: "en",
      responseLang: "ru"
    });

    // Приводим ответ к удобному виду
    res.json({
      status: "done",
      translationId: result.translationId,
      translated: result.translated,
      audioUrl: result.url,
      remainingTime: result.remainingTime,
      raw: result
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({error: err.message});
  }
});

app.listen(3001, () => console.log("Backend running on http://localhost:3001"));

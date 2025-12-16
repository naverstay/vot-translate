export function srtToVtt(srt) {
  return "WEBVTT\n\n" + srt.replace(/,/g, ".");
}

export function srtToJson(srt) {
  const blocks = srt.trim().split("\n\n");
  return blocks.map((block) => {
    const lines = block.split("\n");
    if (lines.length < 3) return null;

    const index = lines[0];
    const time = lines[1];
    const [start, end] = time.split(" --> ");
    const text = lines.slice(2).join("\n");

    return {index, start, end, text};
  }).filter(Boolean);
}

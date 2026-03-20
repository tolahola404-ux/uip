// api/upload.js — uploads file to Anthropic Files API, returns file_id
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Read raw body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);

    // Forward multipart/form-data directly to Anthropic Files API
    const response = await fetch("https://api.anthropic.com/v1/files", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "files-api-2025-04-14",
        "content-type": req.headers["content-type"], // forward boundary info
      },
      body: rawBody,
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: "Upload failed: " + err });
    }

    const data = await response.json();
    return res.status(200).json({ file_id: data.id, filename: data.filename, mime_type: data.mime_type });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

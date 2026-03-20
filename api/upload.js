import { IncomingForm } from "formidable";
import { readFileSync } from "fs";
import { FormData, Blob } from "formdata-node";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Parse the incoming multipart form
    const form = new IncomingForm({ keepExtensions: true });
    const [, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const fileArr = files.file;
    const file = Array.isArray(fileArr) ? fileArr[0] : fileArr;
    if (!file) return res.status(400).json({ error: "No file received" });

    // Read file from disk
    const fileBuffer = readFileSync(file.filepath);
    const blob = new Blob([fileBuffer], { type: file.mimetype || "application/octet-stream" });

    // Build FormData for Anthropic
    const formData = new FormData();
    formData.append("file", blob, file.originalFilename || "upload");

    const response = await fetch("https://api.anthropic.com/v1/files", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "files-api-2025-04-14",
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: "Anthropic upload failed: " + err });
    }

    const data = await response.json();
    return res.status(200).json({
      file_id: data.id,
      filename: data.filename,
      mime_type: data.mime_type,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

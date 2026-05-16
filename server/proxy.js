import express from "express";
import axios from "axios";
import { URL } from "url";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: "10mb" }));

// Simple CORS for dev - adjust in production
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.get("/", (req, res) => {
  res.send("Proxy server running");
});

app.post("/proxy", async (req, res) => {
  const { url, method = "GET", headers = {}, body, timeout = 30000 } = req.body || {};

  if (!url) return res.status(400).json({ error: "Missing url" });

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return res.status(400).json({ error: "Only http/https protocols are allowed" });
    }

    const start = Date.now();
    const response = await axios.request({
      url,
      method: method.toUpperCase(),
      headers,
      data: body,
      responseType: "arraybuffer",
      timeout,
      validateStatus: () => true,
    });
    const time = Date.now() - start;

    const buffer = Buffer.from(response.data || "");
    let text;
    try {
      text = buffer.toString("utf8");
    } catch (e) {
      text = buffer.toString("base64");
    }

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: text,
      contentType: response.headers["content-type"] || "",
      size: buffer.length,
      time,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Proxy error:", err?.message || err);
    res.status(500).json({ error: err?.message || String(err) });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Proxy server listening on http://localhost:${PORT}`);
});

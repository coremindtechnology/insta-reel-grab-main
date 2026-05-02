import express from "express";
import cors from "cors";
import { z } from "zod";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();

// ✅ Proper CORS setup
app.use(cors({
  origin: "https://insta-reel-grab-main-9fwyiewl7-coremind-technologys-projects.vercel.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Range"]
}));

// ✅ Handle preflight explicitly
app.options("*", cors());

app.use(express.json());

const requestSchema = z.object({
  url: z.string().trim().min(12).max(600),
});

// ------------------ RATE LIMIT ------------------
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string) {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return { ok: true };
  }
  if (bucket.count >= 20) return { ok: false };
  bucket.count += 1;
  return { ok: true };
}

// ------------------ HELPERS ------------------
function sanitizeInstagramUrl(value: string) {
  const trimmed = value.trim().replace(/[<>"'`]/g, "");
  const url = new URL(trimmed);
  url.hash = "";
  url.search = "";
  return url.toString();
}

function isInstagramUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    return (
      host === "instagram.com" &&
      /^\/(reel|p|tv)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

// ------------------ SCRAPER ------------------
async function resolveInstagramMedia(url: string) {
  const shortcode = new URL(url).pathname.split("/").filter(Boolean)[1] || "media";

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      timeout: 10000
    });

    const match = html.match(/"video_url":"([^"]+)"/);

    if (match) {
      const videoUrl = match[1].replace(/\\u0026/g, "&").replace(/\\/g, "");

      return {
        id: shortcode,
        videoUrl,
        sourceUrl: url,
        processedAt: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error(err);
  }

  return null;
}

// ------------------ ROUTES ------------------
app.post("/api/process", async (req, res) => {
  try {
    const { url } = requestSchema.parse(req.body);
    const cleanUrl = sanitizeInstagramUrl(url);

    const limit = checkRateLimit(req.ip || "unknown");
    if (!limit.ok) {
      return res.status(429).json({ error: "Too many requests" });
    }

    if (!isInstagramUrl(cleanUrl)) {
      return res.status(400).json({ error: "Invalid Instagram URL" });
    }

    const result = await resolveInstagramMedia(cleanUrl);

    if (!result) {
      return res.status(404).json({ error: "Media not found" });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ------------------ EXPORT ------------------
export default app;
import express from "express";
import cors from "cors";
import { z } from "zod";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ✅ Robust CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Range");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const requestSchema = z.object({
  url: z.string().trim().min(12).max(600),
});

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

function sanitizeInstagramUrl(value: string) {
  const trimmed = value.trim().replace(/[<>"'`]/g, "");
  try {
    const url = new URL(trimmed);
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return trimmed;
  }
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
  const title = `Instagram Reel ${shortcode}`;

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.instagram.com/",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        "Upgrade-Insecure-Requests": "1"
      },
      timeout: 10000
    });

    const patterns = [
      /"video_url":"([^"]+)"/,
      /<meta property="og:video" content="([^"]+)"/,
      /<meta property="og:video:secure_url" content="([^"]+)"/,
      /"video_src":"([^"]+)"/,
      /video_url":"([^"]+)"/,
      /"contentUrl":"([^"]+)"/
    ];

    let videoUrl = null;

    try {
      const ldJsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      if (ldJsonMatch) {
        const ldData = JSON.parse(ldJsonMatch[1]);
        const extractContentUrl = (obj: any): string | null => {
          if (!obj) return null;
          if (obj.contentUrl) return obj.contentUrl;
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const res = extractContentUrl(item);
              if (res) return res;
            }
          }
          if (typeof obj === 'object') {
             for (const key in obj) {
               const res = extractContentUrl(obj[key]);
               if (res) return res;
             }
          }
          return null;
        };
        videoUrl = extractContentUrl(ldData);
      }
    } catch (e) {}

    if (!videoUrl) {
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          let candidate = match[1];
          candidate = candidate.replace(/\\u0026/g, "&").replace(/\\u003d/g, "=").replace(/\\u002f/g, "/").replace(/\\/g, "");
          if (candidate.startsWith("http") && !candidate.includes("<?xml")) {
            videoUrl = candidate;
            break;
          }
        }
      }
    }

    if (!videoUrl) {
      try {
        const apiUrl = `https://www.instagram.com/reels/${shortcode}/?__a=1&__d=dis`;
        const { data } = await axios.get(apiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            "X-IG-App-ID": "936619743392459",
          },
          timeout: 5000
        });
        const mediaData = data?.items?.[0] || data?.graphql?.shortcode_media;
        videoUrl = mediaData?.video_versions?.[0]?.url || mediaData?.video_url;
      } catch (e) {}
    }

    if (videoUrl) {
      const thumbMatch = html.match(/"display_url":"([^"]+)"/) || html.match(/<meta property="og:image" content="([^"]+)"/);
      const thumbUrl = thumbMatch ? thumbMatch[1].replace(/\\u0026/g, "&").replace(/\\/g, "") : `https://www.instagram.com/p/${shortcode}/media/?size=l`;
      
      return {
        id: shortcode,
        title: title,
        videoUrl,
        thumbnailUrl: thumbUrl,
        audioUrl: videoUrl,
        sourceUrl: url,
        processedAt: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error("Scraping error:", err);
  }

  return null;
}

// ------------------ ROUTES ------------------
// Note: In Vercel, if this is api/index.ts, the routes become relative to /api/
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

app.get("/api/download", async (req, res) => {
  const mediaUrl = req.query.url as string;
  const filename = req.query.filename as string || "download.mp4";

  if (!mediaUrl || mediaUrl === "undefined") {
    return res.status(400).send("Valid URL is required");
  }

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  };

  if (req.headers.range) {
    headers["Range"] = req.headers.range;
  }

  try {
    const response = await axios({
      url: mediaUrl,
      method: 'GET',
      responseType: 'stream',
      headers: headers,
      timeout: 15000,
    });

    if (response.status === 206) {
      res.status(206);
    }

    const contentType = (response.headers["content-type"] as any) || "video/mp4";
    const contentRange = response.headers["content-range"] as any;
    const contentLength = (response.headers["content-length"] as any);

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", contentType);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    res.setHeader("Accept-Ranges", "bytes");
    
    response.data.pipe(res);
  } catch (error) {
    res.status(500).send("Download failed.");
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(Number(port), "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

export default app;

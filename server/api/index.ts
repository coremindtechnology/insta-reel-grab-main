import express from "express";
import cors from "cors";
import { z } from "zod";
import dotenv from "dotenv";
import axios from "axios";
import * as cheerio from "cheerio";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ✅ Robust CORS configuration
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS", "PATCH", "DELETE", "PUT"],
  allowedHeaders: ["X-CSRF-Token", "X-Requested-With", "Accept", "Accept-Version", "Content-Length", "Content-MD5", "Content-Type", "Date", "X-Api-Version", "Range", "Authorization"],
  credentials: true
}));

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
  const shortcodeMatch = url.match(/\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;
  
  if (!shortcode) return null;

  const commonHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Upgrade-Insecure-Requests": "1"
  };

  const extractVideoFromHtml = (html: string, targetShortcode: string) => {
    if (!html) return null;
    
    // Safety check: Ensure the HTML actually belongs to our Reel and isn't a login/home page
    // Instagram's home/login pages usually don't have the specific shortcode in the title or meta
    if (!html.includes(targetShortcode) && !html.includes("instagram.com/reels/videos/")) {
      return null;
    }

    const $ = cheerio.load(html);
    let videoUrl = null;

    // 1. Try OG Meta Tags (Most reliable if present)
    videoUrl = $('meta[property="og:video"]').attr('content') || 
               $('meta[property="og:video:secure_url"]').attr('content') ||
               $('meta[name="twitter:player"]').attr('content');

    // 2. Try LD+JSON
    if (!videoUrl) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const data = JSON.parse($(el).html() || "");
          const search = (obj: any): string | null => {
            if (obj?.contentUrl) return obj.contentUrl;
            if (Array.isArray(obj)) {
              for (const item of obj) {
                const res = search(item);
                if (res) return res;
              }
            }
            if (typeof obj === 'object') {
              for (const k in obj) {
                const res = search(obj[k]);
                if (res) return res;
              }
            }
            return null;
          };
          videoUrl = search(data);
          if (videoUrl) return false; // break loop
        } catch (e) {}
      });
    }

    // 3. Regex Fallback (only if specific to video_url and NOT a generic background video)
    if (!videoUrl) {
      const patterns = [
        /"video_url":"([^"]+)"/,
        /"video_src":"([^"]+)"/,
        /"contentUrl":"([^"]+)"/,
        /"video_hd_url":"([^"]+)"/
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          let candidate = match[1].replace(/\\u0026/g, "&").replace(/\\u003d/g, "=").replace(/\\u002f/g, "/").replace(/\\/g, "");
          if (candidate.startsWith("http") && !candidate.includes("<?xml")) {
            // Further validation: is this candidate near our shortcode in the text?
            const index = html.indexOf(match[0]);
            const surrounding = html.substring(Math.max(0, index - 500), Math.min(html.length, index + 500));
            if (surrounding.includes(targetShortcode) || html.includes(`"shortcode":"${targetShortcode}"`)) {
              videoUrl = candidate;
              break;
            }
          }
        }
      }
    }

    return videoUrl;
  };

  const sources = [
    { name: "Direct", url: `https://www.instagram.com/reels/videos/${shortcode}/` },
    { name: "Embed", url: `https://www.instagram.com/reels/${shortcode}/embed/` },
    { name: "Main", url: `https://www.instagram.com/reels/${shortcode}/` },
    { name: "Post", url: `https://www.instagram.com/p/${shortcode}/` }
  ];

  try {
    for (const source of sources) {
      try {
        const { data, status } = await axios.get(source.url, {
          headers: commonHeaders,
          timeout: 8000,
          validateStatus: () => true
        });

        if (status === 200 && data) {
          const videoUrl = extractVideoFromHtml(data, shortcode);
          if (videoUrl) {
            const $ = cheerio.load(data);
            const thumbUrl = $('meta[property="og:image"]').attr('content') || `https://www.instagram.com/p/${shortcode}/media/?size=l`;
            return {
              id: shortcode,
              title: `Instagram Reel ${shortcode}`,
              videoUrl,
              thumbnailUrl: thumbUrl,
              audioUrl: videoUrl,
              sourceUrl: url,
              processedAt: new Date().toISOString(),
            };
          }
        }
      } catch (e) {
        console.warn(`Source ${source.name} failed:`, e instanceof Error ? e.message : e);
      }
    }

    // Final Fallback: Mobile API
    const apiUrls = [
      `https://www.instagram.com/reels/${shortcode}/?__a=1&__d=dis`,
      `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`
    ];
    for (const apiUrl of apiUrls) {
      try {
        const { data, status } = await axios.get(apiUrl, {
          headers: { ...commonHeaders, "X-IG-App-ID": "936619743392459" },
          timeout: 8000,
          validateStatus: () => true
        });
        if (status === 200 && data && typeof data === 'object') {
          const mediaData = data?.items?.[0] || data?.graphql?.shortcode_media;
          if (mediaData) {
            const videoUrl = mediaData?.video_versions?.[0]?.url || mediaData?.video_url;
            if (videoUrl) {
              return {
                id: shortcode,
                title: `Instagram Reel ${shortcode}`,
                videoUrl,
                thumbnailUrl: mediaData?.display_url || `https://www.instagram.com/p/${shortcode}/media/?size=l`,
                audioUrl: videoUrl,
                sourceUrl: url,
                processedAt: new Date().toISOString(),
              };
            }
          }
        }
      } catch (e) {}
    }

  } catch (err) {
    console.error("Scraping error:", err);
  }

  return null;
}

// ------------------ ROUTES ------------------
const router = express.Router();

// Root route for health check
router.get("/", (req, res) => {
  res.json({ status: "ok", message: "InstaFetch API is running" });
});

router.post("/process", async (req, res) => {
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

router.get("/download", async (req, res) => {
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

// Mount the router at both /api and / to handle different Vercel mounting behaviors
app.use("/api", router);
app.use("/", router);

// Fallback 404 handler for debugging
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: "Not Found", 
    path: req.url,
    method: req.method,
    message: "The requested route does not exist on this server."
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(Number(port), "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

export default app;

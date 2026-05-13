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
      /^\/(reels?|p|tv)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)
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
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Sec-Fetch-Dest": "document",
    "Upgrade-Insecure-Requests": "1",
    "Referer": "https://www.instagram.com/"
  };

  const extractVideoFromHtml = (html: string, targetShortcode: string) => {
    if (!html) return null;

    // Safety check: Ensure the HTML actually belongs to our Reel and isn't a login/home page
    // Instagram's home/login pages usually don't have the specific shortcode in the title or meta
    if (!html.includes(targetShortcode) && !html.includes("instagram.com/reels/videos/") && !html.includes("EmbedVideo")) {
      if (html.includes("login") || html.includes("checkpoint")) return "BLOCKED";
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
        } catch (e) { }
      });
    }

    // 4. Look for additional video properties with broader regex
    if (!videoUrl) {
      const additionalPatterns = [
        /"video_url":"([^"]+)"/,
        /"video_src":"([^"]+)"/,
        /"contentUrl":"([^"]+)"/,
        /video_url\\":\\"([^\\"]+)\\"/,
        /"video_versions":\[{"type":\d+,"url":"([^"]+)"/,
        /video_url":"([^"]+)"/
      ];
      for (const pattern of additionalPatterns) {
        const match = html.match(pattern);
        if (match) {
          videoUrl = match[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
          if (videoUrl.startsWith('http')) break;
          videoUrl = null;
        }
      }
    }

    // 5. Check for encoded JSON in scripts (Common in newer IG layouts)
    if (!videoUrl) {
      const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
      if (scriptMatches) {
        for (const script of scriptMatches) {
          if (script.includes("video_url") || script.includes("video_versions")) {
            const innerMatch = script.match(/"video_url":"([^"]+)"/);
            if (innerMatch) {
              videoUrl = innerMatch[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
              break;
            }
          }
        }
      }
    }

    return videoUrl;
  };

  const extractAudioFromHtml = (html: string) => {
    if (!html) return null;
    const cleanHtml = html.replace(/\\\//g, "/");
    const audioPatterns = [
      /"audio_url":"([^"]+)"/,
      /"progressive_download_url":"([^"]+)"/,
      /audio_url\\":\\"([^\\"]+)\\"/,
      /"fast_start_progressive_download_url":"([^"]+)"/,
      /"play_url":"([^"]+)"/
    ];
    for (const pattern of audioPatterns) {
      const match = cleanHtml.match(pattern);
      if (match) {
        const url = match[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
        if (url.startsWith('http')) return url;
      }
    }

    // Fallback: search for any URL with audio mime type
    const mimeMatch = cleanHtml.match(/https?:\/\/[^"\\ ]+mime=audio[^"\\ ]+/g);
    if (mimeMatch) {
      return mimeMatch[0].replace(/\\u0026/g, "&").replace(/\\/g, "");
    }

    return null;
  };

  const sources = [
    { name: "Embed", url: `https://www.instagram.com/reels/${shortcode}/embed/` },
    { name: "Embed Captioned", url: `https://www.instagram.com/reels/${shortcode}/embed/captioned/` },
    { name: "Direct", url: `https://www.instagram.com/reels/videos/${shortcode}/` },
    { name: "Main", url: `https://www.instagram.com/reels/${shortcode}/` },
    { name: "Post", url: `https://www.instagram.com/p/${shortcode}/` }
  ];

  try {
    for (const source of sources) {
      try {
        const { data, status } = await axios.get(source.url, {
          headers: commonHeaders,
          timeout: 12000,
          validateStatus: () => true
        });

        if (status === 200 && data) {
          const videoUrl = extractVideoFromHtml(data, shortcode);
          if (videoUrl === "BLOCKED") {
            console.warn(`Source ${source.name} was blocked by login.`);
            continue;
          }
          if (videoUrl) {
            const $ = cheerio.load(data);
            const thumbUrl = $('meta[property="og:image"]').attr('content') || `https://www.instagram.com/p/${shortcode}/media/?size=l`;
            const audioUrl = extractAudioFromHtml(data) || videoUrl;
            return {
              id: shortcode,
              title: `Instagram Reel ${shortcode}`,
              videoUrl,
              thumbnailUrl: thumbUrl,
              audioUrl: audioUrl,
              sourceUrl: url,
              processedAt: new Date().toISOString(),
            };
          }
        }
      } catch (e) {
        console.warn(`Source ${source.name} failed:`, e instanceof Error ? e.message : e);
      }
    }

    // Final Fallback: Mobile API with more variations
    const apiUrls = [
      `https://www.instagram.com/reels/${shortcode}/?__a=1&__d=dis`,
      `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`,
      `https://www.instagram.com/reels/${shortcode}/?__a=1&__d=1`,
      `https://www.instagram.com/p/${shortcode}/?__a=1&__d=1`
    ];
    for (const apiUrl of apiUrls) {
      try {
        const { data, status } = await axios.get(apiUrl, {
          headers: { ...commonHeaders, "X-IG-App-ID": "936619743392459" },
          timeout: 12000,
          validateStatus: () => true
        });
        if (status === 200 && data && typeof data === 'object') {
          const mediaData = data?.items?.[0] || data?.graphql?.shortcode_media;
          if (mediaData) {
            const videoUrl = mediaData?.video_versions?.[0]?.url || mediaData?.video_url;
            if (videoUrl) {
              const musicData = mediaData?.clips_metadata?.music_info?.music ||
                mediaData?.music_metadata?.music_info?.music ||
                mediaData?.music_info?.music_consumption_info;

              let audioUrl = musicData?.fast_start_progressive_download_url ||
                musicData?.progressive_download_url ||
                musicData?.play_url ||
                mediaData?.audio_url;

              // Force extraction from DASH manifest for genuine audio-only stream
              if (!audioUrl && mediaData?.video_dash_manifest) {
                const dashManifest = mediaData.video_dash_manifest.replace(/&amp;/g, "&").replace(/\\\//g, "/");
                const audioMatch = dashManifest.match(/https?:\/\/[^<" ]+mime=audio[^<" ]+/i);
                if (audioMatch) {
                  audioUrl = audioMatch[0];
                }
              }

              // Even deeper search in the entire media object for any audio-only URL
              if (!audioUrl) {
                const mediaStr = JSON.stringify(mediaData).replace(/\\\//g, "/");
                const anyAudioUrl = mediaStr.match(/https?:\/\/[^"\\ ]+mime=audio[^"\\ ]+/g);
                if (anyAudioUrl) {
                  audioUrl = anyAudioUrl[0].replace(/\\u0026/g, "&").replace(/\\/g, "");
                }
              }

              // Final fallback
              audioUrl = audioUrl || videoUrl;
              return {
                id: shortcode,
                title: `Instagram Reel ${shortcode}`,
                videoUrl,
                thumbnailUrl: mediaData?.display_url || `https://www.instagram.com/p/${shortcode}/media/?size=l`,
                audioUrl: audioUrl,
                sourceUrl: url,
                processedAt: new Date().toISOString(),
              };
            }
          }
        }
      } catch (e) { }
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
  res.json({ status: "ok", message: "InstaFetch API is running", version: "1.2.0" });
});

// Informational GET routes for POST-only endpoints
router.get("/process", (req, res) => {
  res.status(405).json({
    error: "Method Not Allowed",
    message: "This endpoint requires a POST request with a JSON body containing the Instagram URL.",
    example: { url: "https://www.instagram.com/reel/..." }
  });
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
      return res.status(422).json({ error: "Media not found or content is private. Please ensure the URL is correct and the post is public." });
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

    let contentType = (response.headers["content-type"] as any);
    if (filename.endsWith(".mp3")) {
      contentType = "audio/mpeg";
    } else if (!contentType) {
      contentType = "video/mp4";
    }

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

import express from "express";
import cors from "cors";
import { z } from "zod";
import dotenv from "dotenv";
import axios from "axios";
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
const rateBuckets = new Map();
function checkRateLimit(key) {
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt < now) {
        rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
        return { ok: true };
    }
    if (bucket.count >= 20)
        return { ok: false };
    bucket.count += 1;
    return { ok: true };
}
function sanitizeInstagramUrl(value) {
    const trimmed = value.trim().replace(/[<>"'`]/g, "");
    try {
        const url = new URL(trimmed);
        url.hash = "";
        url.search = "";
        return url.toString();
    }
    catch {
        return trimmed;
    }
}
function isInstagramUrl(value) {
    try {
        const url = new URL(value);
        const host = url.hostname.replace(/^www\./, "");
        return (host === "instagram.com" &&
            /^\/(reel|p|tv)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname));
    }
    catch {
        return false;
    }
}
// ------------------ SCRAPER ------------------
async function resolveInstagramMedia(url) {
    const shortcodeMatch = url.match(/\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
    const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;
    if (!shortcode)
        return null;
    const title = `Instagram Reel ${shortcode}`;
    const commonHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Upgrade-Insecure-Requests": "1"
    };
    const fetchWithFallback = async (targetUrl, customHeaders = {}) => {
        try {
            const { data, status } = await axios.get(targetUrl, {
                headers: { ...commonHeaders, ...customHeaders },
                timeout: 10000,
                validateStatus: () => true // Catch all statuses
            });
            if (status !== 200) {
                console.warn(`Fetch failed for ${targetUrl} with status ${status}`);
                return null;
            }
            return data;
        }
        catch (e) {
            return null;
        }
    };
    try {
        // 1. Try Direct Reels Video Endpoint (Very high success rate on Vercel)
        const directReelUrl = `https://www.instagram.com/reels/videos/${shortcode}/`;
        const directHtml = await fetchWithFallback(directReelUrl);
        // 2. Try Main Page
        const html = await fetchWithFallback(url);
        // 3. Try Embed Page
        const embedHtml = await fetchWithFallback(`https://www.instagram.com/reels/${shortcode}/embed/`);
        const combinedHtml = (directHtml || "") + (html || "") + (embedHtml || "");
        if (!combinedHtml) {
            console.error("All HTML fetch attempts failed for", shortcode);
        }
        const patterns = [
            /"video_url":"([^"]+)"/,
            /<meta property="og:video" content="([^"]+)"/,
            /<meta property="og:video:secure_url" content="([^"]+)"/,
            /"video_src":"([^"]+)"/,
            /video_url":"([^"]+)"/,
            /"contentUrl":"([^"]+)"/,
            /"video_hd_url":"([^"]+)"/,
            /"video_versions":\[{"type":\d+,"url":"([^"]+)"/
        ];
        let videoUrl = null;
        // A. LD+JSON Search
        const ldJsonMatch = combinedHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        if (ldJsonMatch) {
            try {
                const ldData = JSON.parse(ldJsonMatch[1]);
                const extract = (obj) => {
                    if (!obj)
                        return null;
                    if (obj.contentUrl && typeof obj.contentUrl === 'string')
                        return obj.contentUrl;
                    if (Array.isArray(obj)) {
                        for (const item of obj) {
                            const res = extract(item);
                            if (res)
                                return res;
                        }
                    }
                    if (typeof obj === 'object') {
                        for (const key in obj) {
                            const res = extract(obj[key]);
                            if (res)
                                return res;
                        }
                    }
                    return null;
                };
                videoUrl = extract(ldData);
            }
            catch (e) { }
        }
        // B. Regex Search
        if (!videoUrl) {
            for (const pattern of patterns) {
                const match = combinedHtml.match(pattern);
                if (match) {
                    let candidate = match[1].replace(/\\u0026/g, "&").replace(/\\u003d/g, "=").replace(/\\u002f/g, "/").replace(/\\/g, "");
                    if (candidate.startsWith("http") && !candidate.includes("<?xml")) {
                        videoUrl = candidate;
                        break;
                    }
                }
            }
        }
        // C. Mobile API Fallback (High resilience)
        if (!videoUrl) {
            const apiUrls = [
                `https://www.instagram.com/reels/${shortcode}/?__a=1&__d=dis`,
                `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`,
                `https://www.instagram.com/p/${shortcode}/media/?size=l` // Not video but last resort for thumb
            ];
            for (const apiUrl of apiUrls) {
                const data = await fetchWithFallback(apiUrl, { "X-IG-App-ID": "936619743392459" });
                if (data && typeof data === 'object') {
                    const mediaData = data?.items?.[0] || data?.graphql?.shortcode_media;
                    videoUrl = mediaData?.video_versions?.[0]?.url || mediaData?.video_url || mediaData?.video_hd_url;
                    if (videoUrl)
                        break;
                }
            }
        }
        if (videoUrl) {
            const thumbMatch = combinedHtml.match(/"display_url":"([^"]+)"/) || combinedHtml.match(/<meta property="og:image" content="([^"]+)"/);
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
    }
    catch (err) {
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
    }
    catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});
router.get("/download", async (req, res) => {
    const mediaUrl = req.query.url;
    const filename = req.query.filename || "download.mp4";
    if (!mediaUrl || mediaUrl === "undefined") {
        return res.status(400).send("Valid URL is required");
    }
    const headers = {
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
        const contentType = response.headers["content-type"] || "video/mp4";
        const contentRange = response.headers["content-range"];
        const contentLength = response.headers["content-length"];
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", contentType);
        if (contentRange)
            res.setHeader("Content-Range", contentRange);
        if (contentLength)
            res.setHeader("Content-Length", contentLength);
        res.setHeader("Accept-Ranges", "bytes");
        response.data.pipe(res);
    }
    catch (error) {
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

import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Download,
  FileAudio,
  Instagram,
  Loader2,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Video,
  Share2,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:3001").trim().replace(/\/+$/, "");

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Instagram Audio Downloader - Save MP3 from Reels" },
      {
        name: "description",
        content: "Download and extract high-quality MP3 audio from any Instagram Reel or Post. Fast, free, and easy to use.",
      },
      { property: "og:title", content: "Instagram Audio Downloader" },
      {
        property: "og:description",
        content: "Extract high-quality MP3 audio from Instagram Reels and Posts with one click.",
      },
      { name: "twitter:title", content: "Instagram Audio Downloader" },
      {
        name: "twitter:description",
        content: "Extract high-quality MP3 audio from Instagram Reels and Posts with one click.",
      },
    ],
    links: [{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }],
  }),
  component: Index,
});

type MediaResponse = {
  id: string;
  title: string;
  sourceUrl: string;
  videoUrl: string;
  thumbnailUrl: string;
  audioUrl: string;
  isGenuineAudio?: boolean;
  processedAt: string;
};

const sampleUrl = "https://www.instagram.com/reel/CxYz123abc_/";

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
    return host === "instagram.com" && /^\/(reels?|p|tv)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

function isInstagramUrlInput(value: string) {
  try {
    return isInstagramUrl(sanitizeInstagramUrl(value));
  } catch {
    return false;
  }
}

function Index() {
  const [url, setUrl] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [media, setMedia] = useState<MediaResponse | null>(null);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastProcessedUrl, setLastProcessedUrl] = useState("");
  const [mode, setMode] = useState<"reels" | "audio">("audio");

  const validUrl = useMemo(() => (url ? isInstagramUrlInput(url) : false), [url]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    const cleanUrl = sanitizeInstagramUrl(url);
    if (validUrl && !isProcessing && cleanUrl !== lastProcessedUrl) {
      processUrl(false); // Do not auto-download on paste
      setLastProcessedUrl(cleanUrl);
    }
  }, [url, validUrl, isProcessing, lastProcessedUrl]);

  useEffect(() => {
    navigator.clipboard
      ?.readText()
      .then((text) => {
        if (!url && isInstagramUrlInput(text)) {
          setUrl(text.trim());
          toast.success("Instagram URL detected from clipboard");
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isProcessing) return;
    setProgress(8);
    const steps = [24, 43, 68, 86, 94];
    const interval = window.setInterval(() => {
      setProgress((current) => steps.find((step) => step > current) || 94);
    }, 420);
    return () => window.clearInterval(interval);
  }, [isProcessing]);

  async function processUrl(autoDownload = false) {
    setError("");
    setMedia(null); // Reset media on new search
    setIsPlaying(false); // Reset player
    if (!validUrl) {
      const message = "Enter a valid Instagram Reel or Post URL.";
      setError(message);
      toast.error(message);
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });


      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Unable to process this Instagram URL.");
      }

      const payload: MediaResponse = await response.json();
      setProgress(100);
      setMedia(payload);
      toast.success("Download options are ready");

      // Auto-trigger download if requested and in audio mode
      if (autoDownload && mode === "audio") {
        openDownload(payload, "audio");
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to process this Instagram URL.";
      setError(message);
      toast.error(message);
    } finally {
      window.setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 520);
    }
  }

  function openDownload(item: MediaResponse, type: "video" | "audio") {
    const target = type === "video" ? item.videoUrl : item.audioUrl;
    
    // Enforce .mp3 extension for audio as requested
    let extension = type === "video" ? "mp4" : "mp3";
    
    const filename = `instafetch_${item.id}.${extension}`;

    // Use the proxy download endpoint to force download
    const downloadUrl = `${API_BASE_URL}/api/download?url=${encodeURIComponent(target)}&filename=${encodeURIComponent(filename)}`;

    // Create a temporary link and trigger download
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!isInstagramUrlInput(text)) {
        toast.error("Clipboard does not contain a valid Instagram URL");
        return;
      }
      setUrl(text.trim());
      toast.success("URL pasted");
    } catch (err: any) {
      console.error("Clipboard error:", err);
      if (err.name === 'NotAllowedError') {
        toast.error("Clipboard blocked! Please click the icon next to the URL bar and Allow 'Clipboard' access.", {
          duration: 6000,
        });
      } else {
        toast.error("Unable to read clipboard. Please paste manually (Ctrl+V).");
      }
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: "ReelSave.App - Instagram Downloader",
      text: "Download Instagram Reels and Audio for free in high quality!",
      url: window.location.origin,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Website link copied to clipboard!");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Share failed:", err);
      }
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 h-16 flex items-center justify-center">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => window.location.reload()}>
            <span className="text-xl font-black text-primary">ReelSave</span>
            <span className="text-xl font-black text-foreground">.App</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <nav className="flex items-center gap-1 sm:gap-4">
              <button
                onClick={() => setMode("reels")}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-300 ${mode === "reels" ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Video className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Reels</span>
              </button>
              <button
                onClick={() => setMode("audio")}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-300 ${mode === "audio" ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"}`}
              >
                <FileAudio className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Audio</span>
              </button>
            </nav>

            <div className="h-6 w-px bg-border/50 mx-1"></div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground" onClick={handleShare}>
                <Share2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-10 w-10 text-muted-foreground"
                aria-label="Toggle dark mode"
                onClick={() => setIsDark((value) => !value)}
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="aurora-field pointer-events-none absolute left-1/2 top-0 h-72 w-[70rem] -translate-x-1/2 rounded-full opacity-80" />
      <div className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] w-full flex-col pt-20">

        <section className="flex-1 space-y-8 py-8 lg:py-12 w-full">


          <div className="animate-rise space-y-7 text-center max-w-4xl mx-auto w-full">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-medium text-muted-foreground shadow-app backdrop-blur-xl mx-auto">
              <Sparkles className="h-4 w-4 text-primary" />
              Public Reels and Posts only
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-black leading-tight tracking-normal text-foreground sm:text-5xl lg:text-6xl mx-auto">
                {mode === "reels" ? (
                  <>
                    Download Instagram <span className="text-gradient-instagram">Reels Video</span>
                  </>
                ) : (
                  <>
                    Extract Reel <span className="text-gradient-instagram">Audio (MP3)</span>
                  </>
                )}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg mx-auto">
                {mode === "reels"
                  ? "Download high-quality Instagram Reels and videos instantly without watermark."
                  : "Paste a public Instagram Reel or Post URL to extract and download high-quality MP3 audio instantly."}
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-4 sm:p-6 max-w-2xl mx-auto text-left relative overflow-hidden">
              <label htmlFor="instagram-url" className="mb-2 block text-sm font-semibold text-foreground">
                Instagram URL
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    id="instagram-url"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setError("");
                    }}
                    placeholder={sampleUrl}
                    inputMode="url"
                    className="h-14 w-full rounded-2xl border border-input bg-background/70 px-4 pr-12 text-sm text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
                  />
                  <button
                    type="button"
                    onClick={pasteFromClipboard}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Paste URL"
                  >
                    <Clipboard className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Paste links like instagram.com/reel/... or instagram.com/p/...
              </div>

              {error ? (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className="mt-5">
                <Button variant="instagram" size="lg" className="w-full" disabled={isProcessing} onClick={() => processUrl(true)}>
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "reels" ? <Download className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  {mode === "reels" ? "Download Video" : "Download Audio"}
                </Button>
              </div>

              {/* Progress Bar inside the card */}
              {isProcessing ? (
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span>Processing media</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="progress-shimmer h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Results Section - Moved here to appear right after search */}
          {/* Results Section - Immersive Vertical Preview */}
          {media && (
            <div id="results" className="animate-rise space-y-8 max-w-4xl mx-auto w-full pt-8">
              {mode === "reels" ? (
                <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
                  {/* Vertical Reel Preview */}
                  <div className="w-full lg:w-auto flex-shrink-0 mx-auto">
                    <div className="glass-panel rounded-[2rem] p-3 border-primary/20 shadow-2xl bg-card/40 backdrop-blur-3xl relative overflow-hidden group">
                      <div className="absolute -inset-0.5 bg-gradient-to-b from-primary/20 to-secondary/20 rounded-[2rem] blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                      <div className="relative overflow-hidden rounded-[1.75rem] border border-border/50 bg-black shadow-inner aspect-[9/16] w-full max-w-[320px] mx-auto md:max-w-[380px]">
                        <div className="relative h-full w-full flex items-center justify-center">
                          {!isPlaying ? (
                            <>
                              <img
                                src={`${API_BASE_URL}/api/download?url=${encodeURIComponent(media.thumbnailUrl)}&filename=thumb.jpg`}
                                alt={`Preview for ${media.title}`}
                                className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <button
                                  onClick={() => setIsPlaying(true)}
                                  className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/95 text-white backdrop-blur-md shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 group/play"
                                >
                                  <div className="ml-1.5 border-y-[14px] border-y-transparent border-l-[24px] border-l-white drop-shadow-lg" />
                                </button>
                              </div>

                              {/* Reel Meta Overlay (Like Instagram) */}
                              <div className="absolute bottom-6 left-6 right-6 text-white text-left pointer-events-none">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-0.5">
                                    <div className="h-full w-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                                      <Instagram className="h-4 w-4 text-white" />
                                    </div>
                                  </div>
                                  <span className="text-sm font-bold drop-shadow-md">instagram_reel</span>
                                </div>
                                <p className="text-xs line-clamp-2 drop-shadow-md opacity-90">{media.title}</p>
                              </div>
                            </>
                          ) : (
                            <video
                              src={`${API_BASE_URL}/api/download?url=${encodeURIComponent(media.videoUrl)}&filename=preview.mp4`}
                              controls
                              autoPlay
                              className="h-full w-full object-cover rounded-[1.75rem]"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Download Options & Details */}
                  <div className="flex-1 w-full space-y-6 pt-4 lg:pt-10">
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary tracking-wide uppercase">
                        <Sparkles className="h-3.5 w-3.5" />
                        Media Ready
                      </div>
                      <h3 className="font-black text-foreground text-3xl sm:text-4xl leading-tight tracking-tight">{media.title}</h3>
                      <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Verified high-quality source • {new Date(media.processedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="h-px w-full bg-gradient-to-r from-border/50 via-border to-transparent"></div>

                    <div className="grid gap-5">
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Video Download</p>
                        <Button
                          variant="instagram"
                          size="lg"
                          className="w-full h-16 text-xl font-black shadow-app-lg hover:translate-y-[-2px] transition-all duration-300 rounded-2xl group"
                          onClick={() => openDownload(media, "video")}
                        >
                          <Video className="mr-3 h-7 w-7 text-white group-hover:scale-110 transition-transform" />
                          Download Video (MP4)
                          <div className="ml-auto bg-white/20 px-3 py-1 rounded-lg text-xs font-bold">1080p</div>
                        </Button>
                      </div>
                    </div>

                    <div className="bg-secondary/20 rounded-2xl p-4 border border-border/50 flex items-start gap-3">
                      <div className="mt-1 bg-primary/20 p-1.5 rounded-lg text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Your download will start automatically via our high-speed proxy server. No watermarks will be added to the final file.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto shadow-2xl border border-border/50 bg-card/60 backdrop-blur-3xl space-y-6">
                  <div className="flex items-start gap-5">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-border shadow-lg relative group">
                      <img
                        src={`${API_BASE_URL}/api/download?url=${encodeURIComponent(media.thumbnailUrl)}&filename=thumb.jpg`}
                        alt="Thumbnail"
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="border-y-[6px] border-y-transparent border-l-[10px] border-l-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 className="font-bold text-lg truncate text-foreground leading-tight">{media.title}</h3>
                      <p className="text-xs text-primary font-black uppercase tracking-widest mt-2 flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        High Quality Audio
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <audio
                      src={`${API_BASE_URL}/api/download?url=${encodeURIComponent(media.audioUrl)}&filename=preview.mp3`}
                      controls
                      className="flex-1 h-11"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-11 w-11 rounded-xl shrink-0 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                      onClick={() => openDownload(media, "audio")}
                      title="Download MP3"
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="grid gap-3.5 pt-4">
                    <Button
                      variant="instagram"
                      size="lg"
                      className="w-full h-14 text-lg font-black rounded-2xl shadow-app-lg transition-all active:scale-[0.98] bg-blue-600 hover:bg-blue-700 border-none"
                      onClick={() => openDownload(media, "audio")}
                    >
                      <Download className="mr-2 h-6 w-6" />
                      Download Audio
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full h-14 text-lg font-black rounded-2xl border-2 border-green-500/20 text-green-600 hover:bg-green-500 hover:text-white transition-all active:scale-[0.98]"
                      onClick={() => {
                        setMedia(null);
                        setUrl("");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <RotateCcw className="mr-2 h-6 w-6" />
                      Download Again
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="max-w-7xl mx-auto space-y-6 text-left animate-rise py-8 border-t border-border/50 w-full">
            <h2 className="text-2xl font-bold text-foreground">Instagram Reels Audio Download</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Our <strong>Instagram Reels Audio Download</strong> tool is designed to provide you with the fastest and most reliable way to save the audio from your favorite Instagram content. Whether it's a trending song, a funny soundbite, or an inspiring speech, our <strong>Instagram audio downloader</strong> ensures you get high-quality MP3 files every time.
              </p>
              <p>
                We support a wide range of content, making <strong>Reels audio download</strong> seamless across all devices, including mobile, tablet, and desktop. Simply paste the URL and our system will extract the audio in seconds. This is perfect for saving background music or podcasts directly from Instagram posts while maintaining excellent audio clarity.
              </p>
              <p>
                Experience the ultimate convenience with our clean, responsive interface. No registration or login is required, and we prioritize your privacy while providing high-speed extractions. Start using our service today for all your <strong>Instagram audio</strong> needs and enjoy your favorite sounds offline anytime, anywhere.
              </p>
            </div>

            <div className="mt-10 space-y-6 pt-8 border-t border-border/30 w-full">
              <h3 className="text-xl font-bold text-foreground">Key Features of Instagram Reels Audio Download</h3>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <li className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-muted-foreground"><strong>High-Quality MP3:</strong> Extract audio in the best possible quality for clear listening.</span>
                </li>
                <li className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-muted-foreground"><strong>Fast & Efficient:</strong> Get your MP3 links in seconds with our high-speed extraction system.</span>
                </li>
                <li className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-muted-foreground"><strong>No Registration Required:</strong> Start downloading audio immediately without creating an account.</span>
                </li>
                <li className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-muted-foreground"><strong>One-Click Extraction:</strong> Easily convert any Instagram Reel or video to MP3 with a single click.</span>
                </li>
                <li className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-muted-foreground"><strong>Multi-Device Compatibility:</strong> Works perfectly on all mobile, tablet, and desktop web browsers.</span>
                </li>
              </ul>
            </div>

            <div className="mt-16 space-y-12 pt-10 border-t border-border/30 w-full max-w-7xl mx-auto">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-black text-primary">Ways to Download Instagram Audio</h2>
                <p className="max-w-4xl mx-auto text-muted-foreground">
                  InstaFetch provides an easy way to extract audio from Instagram Reels. Just follow these simple steps to download MP3s.
                  We guide you with images to make it even easier to understand the process.
                </p>
              </div>

              <div className="grid gap-12 sm:grid-cols-3">
                <div className="flex flex-col items-center text-center space-y-6">
                  <h3 className="text-xl font-bold text-primary">Reels to Download</h3>
                  <div className="w-full aspect-video overflow-hidden rounded-2xl border border-border shadow-sm bg-secondary/30">
                    <img src="/guide/step1.png" alt="Reels to Download" className="h-full w-full object-cover" />
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground px-2">
                    Open the IG app and copy your favourite Reels that you want to download. Just click on the share icon and then click on the copy link icon.
                  </p>
                </div>

                <div className="flex flex-col items-center text-center space-y-6">
                  <h3 className="text-xl font-bold text-primary">Reels Downloader</h3>
                  <div className="w-full aspect-video overflow-hidden rounded-2xl border border-border shadow-sm bg-secondary/30">
                    <img src="/guide/step2.png" alt="Reels Downloader" className="h-full w-full object-cover" />
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground px-2">
                    Paste the link in the InstaFetch Reels Downloader and click search to start processing your request. The Reels downloader will prepare your Reels in seconds.
                  </p>
                </div>

                <div className="flex flex-col items-center text-center space-y-6">
                  <h3 className="text-xl font-bold text-primary">Save Instagram Audio</h3>
                  <div className="w-full aspect-video overflow-hidden rounded-2xl border border-border shadow-sm bg-secondary/30">
                    <img src="/guide/step3.png" alt="Save Instagram Audio" className="h-full w-full object-cover" />
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground px-2">
                    Click on the download button to download the Instagram Reels, and the Reels will be saved in your downloads folder or phone gallery. Now you can enjoy your high-quality downloaded Reels.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-20 flex flex-col lg:flex-row items-center gap-12 pt-16 border-t border-border/30 animate-rise w-full max-w-7xl mx-auto">
            <div className="lg:w-1/2">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border shadow-2xl">
                  <img src="/images/promo.png" alt="No Watermark Instagram Reels Download" className="h-full w-full object-cover transform hover:scale-105 transition duration-500" />
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 space-y-6">
              <h2 className="text-3xl sm:text-4xl font-black text-foreground leading-tight">
                Download Instagram Audio <span className="text-primary">in High Quality MP3</span>
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Are you looking for the best way to <strong>Download Instagram Audio in High Quality</strong>? You've come to the right place. Our advanced extractor ensures that every MP3 you save is in its best available quality, perfect for listening on any device or using in your own projects.
                </p>
                <p>
                  Unlike many other tools, our system prioritizes audio fidelity. When you use InstaFetch for your <strong>Instagram Reels audio download</strong>, we fetch the highest bit-rate stream available. Whether it's a 128kbps or 320kbps source, you get the clearest audio saved locally on your device.
                </p>
                <p>
                  The process is completely free and requires no registration. We believe that accessing your favorite audio should be simple and fast. Our servers are optimized to handle extractions in seconds, meaning you don't have to wait around. Just paste the link, and let our engine do the heavy lifting for you.
                </p>
                <p>
                  Compatibility is never an issue. You can download audio on your iPhone, Android, or PC without any additional software. Our web-based platform is fully responsive and secure, ensuring that your data remains private while you get the best <strong>Instagram MP3 download</strong> experience available today.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-20 space-y-12 pt-16 border-t border-border/30 animate-rise w-full max-w-7xl mx-auto">
            <div className="text-center space-y-4">
              <h2 className="text-3xl sm:text-4xl font-black text-foreground">How to download Instagram Audio?</h2>
              <p className="max-w-2xl mx-auto text-muted-foreground">
                Follow these steps for Instagram Audio Download. We guided step by step method for Instagram reels MP3 download in easiest way.
              </p>
            </div>

            <div className="grid gap-4 max-w-3xl mx-auto">
              <div className="flex gap-5 items-start glass-panel p-5 rounded-2xl border border-border/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-app">1</div>
                <p className="text-foreground leading-relaxed pt-2">Copy the link of your Instagram Reels video which you want to download.</p>
              </div>
              <div className="flex gap-5 items-start glass-panel p-5 rounded-2xl border border-border/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-app">2</div>
                <p className="text-foreground leading-relaxed pt-2">Open <span className="font-bold text-primary">InstaFetch</span> for Instagram reels download.</p>
              </div>
              <div className="flex gap-5 items-start glass-panel p-5 rounded-2xl border border-border/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-app">3</div>
                <p className="text-foreground leading-relaxed pt-2">Now, paste the copied URL into the input box.</p>
              </div>
              <div className="flex gap-5 items-start glass-panel p-5 rounded-2xl border border-border/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-app">4</div>
                <p className="text-foreground leading-relaxed pt-2">Audio downloader automatically sync your reel and creates a downloadable MP3 link.</p>
              </div>
              <div className="flex gap-5 items-start glass-panel p-5 rounded-2xl border border-border/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-app">5</div>
                <p className="text-foreground leading-relaxed pt-2">Hit on the download button to save the audio. See how easy it is!</p>
              </div>
            </div>
          </div>

          <div className="mt-24 space-y-12 pt-16 border-t border-border/30 animate-rise w-full max-w-7xl mx-auto">
            <div className="text-center space-y-4">
              <h2 className="text-3xl sm:text-4xl font-black text-foreground">How to copy link for Instagram Reels Download?</h2>
              <p className="max-w-2xl mx-auto text-muted-foreground">
                Follow these simple steps to copy the link of any Instagram Reel you want to download. It's quick and easy!
              </p>
            </div>

            <div className="grid gap-12 sm:grid-cols-3">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative group w-full">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition"></div>
                  <div className="relative aspect-[9/16] max-w-[220px] mx-auto overflow-hidden rounded-2xl border border-border shadow-lg">
                    <img src="/copy-guide/step1.png" alt="Open Instagram" className="h-full w-full object-cover" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-primary">1. Open Instagram</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed px-2">
                    Open Instagram and choose the reels which you want to download or save.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative group w-full">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition"></div>
                  <div className="relative aspect-[9/16] max-w-[220px] mx-auto overflow-hidden rounded-2xl border border-border shadow-lg">
                    <img src="/copy-guide/step2.png" alt="Click 3 Dots" className="h-full w-full object-cover" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-primary">2. Click 3 Dots Icon</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed px-2">
                    At the bottom, click on the 3 dots icon. A popup menu will open.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative group w-full">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition"></div>
                  <div className="relative aspect-[9/16] max-w-[220px] mx-auto overflow-hidden rounded-2xl border border-border shadow-lg">
                    <img src="/copy-guide/step3.png" alt="Copy Link" className="h-full w-full object-cover" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-primary">3. Click Copy Link</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed px-2">
                    Click on the Copy Link option. That’s it! Your link is copied.
                  </p>
                </div>
              </div>
            </div>
          </div>




          <div className="mt-24 py-12 border-t border-border/30 animate-rise w-full max-w-7xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-8 text-left">Terms & Conditions</h2>
            <div className="glass-panel p-8 rounded-3xl border border-border/50 text-left space-y-6">
              <div className="flex gap-4 items-start">
                <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0"></div>
                <p className="text-muted-foreground leading-relaxed">
                  This site is for <span className="text-foreground font-semibold">educational purposes</span>. This site is using information that is freely available.
                </p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0"></div>
                <p className="text-muted-foreground leading-relaxed">
                  This site has not any right of videos or photos in which you have downloaded the only right of respected users and all the copyright and trademark goes to them.
                </p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0"></div>
                <p className="text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-semibold">Instagram</span> and <span className="text-foreground font-semibold">Instagram logos</span> are trademark and copyright of Facebook Inc.
                </p>
              </div>
            </div>
          </div>




        </section>

        <footer className="py-4 text-center text-sm text-muted-foreground max-w-4xl mx-auto w-full">Made with ❤️</footer>
      </div>
    </main>
  );
}
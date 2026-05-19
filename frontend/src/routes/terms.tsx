import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/terms")({
  component: TermsComponent,
});

function TermsComponent() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-foreground sm:px-6 lg:px-8 bg-background">
      {/* Background Aurora Effect */}
      <div className="aurora-field pointer-events-none absolute left-1/2 top-0 h-72 w-[70rem] -translate-x-1/2 rounded-full opacity-80" />

      <div className="relative mx-auto max-w-4xl w-full pt-10 pb-20">
        {/* Navigation / Header */}
        <div className="flex items-center justify-between mb-12 border-b border-border/30 pb-5">
          <Link
            to="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-semibold">Back to Home</span>
          </Link>
          <div className="flex items-center gap-1">
            <span className="text-lg font-black text-primary">
              SaveReelAudio
              <span className="text-black dark:text-white">.App</span>
            </span>
          </div>
        </div>

        {/* Content Card */}
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-border/50 space-y-8 shadow-app-lg">
          <div className="flex items-center gap-4 border-b border-border/30 pb-6">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-foreground">
                Terms & Conditions
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Last updated: May 20, 2026
              </p>
            </div>
          </div>

          <div className="space-y-6 text-muted-foreground leading-relaxed text-sm sm:text-base">
            <p>
              Welcome to{" "}
              <strong className="text-foreground">SaveReelAudio</strong>! These
              terms and conditions outline the rules and regulations for the use
              of SaveReelAudio's Website, located at savereelaudio.vercel.app.
            </p>
            <p>
              By accessing this website, we assume you accept these terms and
              conditions. Do not continue to use SaveReelAudio if you do not
              agree to take all of the terms and conditions stated on this page.
            </p>

            <h2 className="text-xl font-bold text-foreground pt-4 border-b border-border/20 pb-2">
              1. Educational & Fair Use
            </h2>
            <p>
              SaveReelAudio is intended exclusively for{" "}
              <strong className="text-foreground">
                personal, educational, and non-commercial fair use
              </strong>
              . Users are permitted to extract public video/audio metadata for
              educational analysis, archiving, or offline enjoyment.
            </p>

            <h2 className="text-xl font-bold text-foreground pt-4 border-b border-border/20 pb-2">
              2. Intellectual Property Rights & Copyright
            </h2>
            <p>
              We absolutely respect the intellectual property rights of others.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                SaveReelAudio{" "}
                <strong className="text-foreground">
                  does not own, host, re-transmit, or store
                </strong>{" "}
                any of the media files retrieved by our scraper. All downloads
                are fetched on-demand directly from Instagram's official CDN
                networks.
              </li>
              <li>
                All copyrights, trademarks, and intellectual property rights in
                the media (reels, videos, audio tracks) belong entirely to their
                respective content creators or publishers.
              </li>
              <li>
                You must obtain explicit authorization/written permission from
                the original owner before redistributing, altering, or using any
                downloaded media for public or commercial purposes.
              </li>
            </ul>

            <h2 className="text-xl font-bold text-foreground pt-4 border-b border-border/20 pb-2">
              3. Prohibited Uses
            </h2>
            <p>By using our service, you agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Use this website for any form of copyright infringement or
                intellectual property violation.
              </li>
              <li>
                Attempt to scrape, overload, or bypass the server's
                rate-limiting controls.
              </li>
              <li>
                Re-host, modify, or embed SaveReelAudio's backend API inside
                commercial apps without permission.
              </li>
            </ul>

            <h2 className="text-xl font-bold text-foreground pt-4 border-b border-border/20 pb-2">
              4. Disclaimer of Warranties
            </h2>
            <p>
              This website and all its API endpoints are provided "as is",
              without any warranties of any kind. We do not guarantee that the
              scraping logic will be uninterrupted, error-free, or compatible
              with future updates to Instagram's dynamic website structures.
              SaveReelAudio is not liable for any direct or indirect damages
              arising out of your use or inability to use this service.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-muted-foreground">
          &copy; 2020-2026 SaveReelAudio - All Rights Reserved.
        </div>
      </div>
    </main>
  );
}

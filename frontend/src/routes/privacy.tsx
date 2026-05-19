import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy")({
  component: PrivacyComponent,
});

function PrivacyComponent() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Sync dark mode state from root html class
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
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-foreground">
                Privacy Policy
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Last updated: May 20, 2026
              </p>
            </div>
          </div>

          <div className="space-y-6 text-muted-foreground leading-relaxed text-sm sm:text-base">
            <p>
              At <strong className="text-foreground">SaveReelAudio</strong>,
              accessible from savereelaudio.vercel.app, one of our main
              priorities is the privacy of our visitors. This Privacy Policy
              document contains types of information that is collected and
              recorded by SaveReelAudio and how we use it.
            </p>

            <h2 className="text-xl font-bold text-foreground pt-4 border-b border-border/20 pb-2">
              1. Consent
            </h2>
            <p>
              By using our website, you hereby consent to our Privacy Policy and
              agree to its terms.
            </p>

            <h2 className="text-xl font-bold text-foreground pt-4 border-b border-border/20 pb-2">
              2. Information We Collect
            </h2>
            <p>
              SaveReelAudio is a free online tool. We{" "}
              <strong className="text-foreground">
                do not require registration
              </strong>
              , nor do we collect any personal information (such as your name,
              email address, or phone number) to use our service.
            </p>
            <p>
              All video/audio extractions are processed on the fly and
              downloaded directly from official content delivery networks
              (CDNs). We do not host, store, or copy any user-requested media on
              our servers.
            </p>

            <h2 className="text-xl font-bold text-foreground pt-4 border-b border-border/20 pb-2">
              3. Cookies and Web Beacons
            </h2>
            <p>
              Like any other website, SaveReelAudio uses 'cookies'. These
              cookies are used to store information including visitors'
              preferences, and the pages on the website that the visitor
              accessed or visited. The information is used to optimize the
              users' experience by customizing our web page content based on
              visitors' browser type and/or other information.
            </p>

            <h2 className="text-xl font-bold text-foreground pt-4 border-b border-border/20 pb-2">
              4. Third-Party Advertisements & Analytics
            </h2>
            <p>
              We may utilize third-party services such as Google AdSense or
              Google Analytics to serve ads and analyze web traffic:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Third-party vendors, including Google, use cookies to serve ads
                based on a user's prior visits to your website or other
                websites.
              </li>
              <li>
                Google's use of advertising cookies enables it and its partners
                to serve ads to your users based on their visit to your sites
                and/or other sites on the Internet.
              </li>
              <li>
                You may opt out of personalized advertising by visiting Ads
                Settings or your browser's cookie settings.
              </li>
            </ul>

            <h2 className="text-xl font-bold text-foreground pt-4 border-b border-border/20 pb-2">
              5. Contact Us
            </h2>
            <p>
              If you have additional questions or require more information about
              our Privacy Policy, do not hesitate to contact us through our
              Contact Us page.
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

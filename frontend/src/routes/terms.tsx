import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/terms")({
  component: TermsComponent,
});

function TermsComponent() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-foreground sm:px-6 lg:px-8 bg-background">
      {/* Universal Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 h-16 flex items-center justify-center">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 cursor-pointer">
            <span className="text-xl font-black text-primary">
              SaveReelAudio
              <span className="text-black dark:text-white">.App</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-6">
            <nav className="flex items-center gap-4 text-sm font-bold">
              <Link
                to="/"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Home
              </Link>
              <Link
                to="/contact"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Contact
              </Link>
            </nav>

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl"
              onClick={() => setIsDark(!isDark)}
            >
              {isDark ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Background Aurora Effect */}
      <div className="aurora-field pointer-events-none absolute left-1/2 top-0 h-72 w-[70rem] -translate-x-1/2 rounded-full opacity-80" />

      <div className="relative mx-auto max-w-4xl w-full pt-20 pb-20">
        {/* Content Card */}
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-border/50 space-y-8 shadow-app-lg mt-10">
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
              Welcome to <strong className="text-foreground">SaveReelAudio.App</strong>!
              These terms and conditions outline the essential rules, guidelines, and regulations
              governing the use of SaveReelAudio.App's website, located at{" "}
              <a
                href="https://savereelaudio.vercel.app"
                className="text-primary hover:underline font-medium"
              >
                https://savereelaudio.vercel.app
              </a>.
            </p>
            <p>
              By accessing and interacting with this platform, we assume you agree to accept these
              terms and conditions in full. Please do not continue to utilize SaveReelAudio.App if
              you disagree with any of the terms or disclaimers stated on this page.
            </p>

            <h2 className="text-xl font-bold text-foreground pt-4 border-b border-border/20 pb-2">
              1. Cookies
            </h2>
            <p>
              We employ the use of cookies. By accessing SaveReelAudio.App, you agree to the use of cookies in accordance with our Privacy Policy. Most modern interactive websites utilize cookies to retrieve specific user preferences and session states for each visit. Cookies make navigation smoother and ensure all tools operate correctly. Some of our advertising or affiliate partners may also utilize cookies.
            </p>

            <h2 className="text-xl font-bold text-foreground pt-4 border-b border-border/20 pb-2">
              2. Intellectual Property & Usage License
            </h2>
            <p>
              Unless otherwise explicitly stated, SaveReelAudio.App and/or its licensors own all the intellectual property rights for the design, tools, code, and structural material on this website. All intellectual property rights are strictly reserved.
            </p>
            <p>
              You may access these features for your own personal, educational, and non-commercial fair use, subject to the following restrictions:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must not republish, sell, rent, or sub-license any material from SaveReelAudio.App.</li>
              <li>You must not reproduce, duplicate, copy, or redistribute content from SaveReelAudio.App for commercial use.</li>
            </ul>

            <h2 className="text-xl font-bold text-foreground pt-4 border-b border-border/20 pb-2">
              3. User Comments & Feedback
            </h2>
            <p>
              Certain areas of this website may offer users the opportunity to post comments, feedback, or reviews. SaveReelAudio.App does not filter, edit, publish, or pre-approve comments before they appear live. Comments reflect the personal views of the individual authors and do not represent the opinions of SaveReelAudio.App, its owners, or partners.
            </p>
            <p>
              To the extent permitted by law, SaveReelAudio.App shall not be liable for comments or for any expenses, damages, or liabilities caused by the posting or appearance of user comments on this platform. We reserve the right to monitor and remove any comment that is deemed inappropriate, offensive, or violates these terms.
            </p>

            <h2 className="text-xl font-bold text-foreground pt-4 border-b border-border/20 pb-2">
              4. Hyperlinking to our Content
            </h2>
            <p>
              Government agencies, search engines, news organizations, and online directory distributors are welcome to hyperlink to our homepage without prior written approval. We may also consider link requests from community portals, educational institutions, or legal firms, provided the link is not deceptive and fits within the context of general resource sharing.
            </p>

            <h2 className="text-xl font-bold text-foreground pt-4 border-b border-border/20 pb-2">
              5. Content & Framing (iFrames)
            </h2>
            <p>
              Without prior approval and written permission, you may not create frames around our webpages that alter in any way the visual presentation or branding appearance of our website. Additionally, we are not responsible for any external content showing on your own websites that links to our service.
            </p>

            <h2 className="text-xl font-bold text-foreground pt-4 border-b border-border/20 pb-2">
              6. Reservation of Rights
            </h2>
            <p>
              We reserve the right to request the removal of all links or any particular link to our website. You agree to immediately remove any links to our website upon request. We also reserve the right to amend these terms, disclaimers, and linking policies at any time.
            </p>

            <h2 className="text-xl font-bold text-foreground pt-4 border-b border-border/20 pb-2">
              7. Accuracy of Information & Disclaimer
            </h2>
            <p>
              While we make every effort to maintain the accuracy and functionality of our online download tools, we do not guarantee that the scraper will always be complete, error-free, or up-to-date with Instagram's future backend alterations.
            </p>
            <p>
              To the maximum extent permitted by law, we exclude all representations, warranties, and conditions relating to our website and the use of this service. Since our website, download tools, and media processing services are provided entirely free of charge, SaveReelAudio.App will not be held liable for any loss or damage of any nature.
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

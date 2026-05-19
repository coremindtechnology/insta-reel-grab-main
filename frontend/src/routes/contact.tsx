import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Send, Check, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/contact")({
  component: ContactComponent,
});

function ContactComponent() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      toast.success(
        "Message sent successfully! We will get back to you shortly.",
      );
      setForm({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-foreground sm:px-6 lg:px-8 bg-background flex flex-col justify-between">
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

      <div className="relative mx-auto max-w-7xl w-full pt-20 pb-10 flex-grow">
        {/* Content Card (Full Width) */}
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-border/50 space-y-8 shadow-app-lg mt-10 w-full">
          <div className="flex items-center gap-4 border-b border-border/30 pb-6">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-foreground">
                Contact Us
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Have any questions or feedback? Drop us a message!
              </p>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-5">
            {/* Left Contact Info */}
            <div className="md:col-span-2 space-y-6">
              <div className="p-6 rounded-2xl border border-border/30 bg-card/40 backdrop-blur-md space-y-3">
                <h3 className="font-bold text-foreground text-lg">
                  Get in touch
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  For support, advertisement inquiries, feature requests, or DMCA
                  copyright takedown requests, please email us directly or use this
                  contact form.
                </p>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl border border-border/20 bg-primary/5">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-semibold text-foreground">
                  support@savereelaudio.com
                </span>
              </div>
            </div>

            {/* Right Contact Form */}
            <div className="md:col-span-3">
              {submitted ? (
                <div className="flex flex-col items-center justify-center text-center p-8 border border-green-500/20 bg-green-500/5 rounded-2xl space-y-4 animate-scaleUp">
                  <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                    <Check className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    Thank you!
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Your message was sent successfully. Our team will review and
                    reply within 24-48 hours.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSubmitted(false)}
                    className="mt-4"
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="name"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        Your Name *
                      </label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        placeholder="John Doe"
                        required
                        className="rounded-xl border-border/40 focus:border-primary/50 h-11 bg-background/30"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="email"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        Email Address *
                      </label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        placeholder="john@example.com"
                        required
                        className="rounded-xl border-border/40 focus:border-primary/50 h-11 bg-background/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="subject"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Subject
                    </label>
                    <Input
                      id="subject"
                      value={form.subject}
                      onChange={(e) =>
                        setForm({ ...form, subject: e.target.value })
                      }
                      placeholder="DMCA / Partnership / Inquiry"
                      className="rounded-xl border-border/40 focus:border-primary/50 h-11 bg-background/30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="message"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Message *
                    </label>
                    <textarea
                      id="message"
                      value={form.message}
                      onChange={(e) =>
                        setForm({ ...form, message: e.target.value })
                      }
                      placeholder="Write your message here..."
                      rows={5}
                      required
                      className="w-full rounded-xl border border-border/40 focus:border-primary/50 focus:outline-none p-3 text-sm bg-background/30 backdrop-blur-sm focus:ring-1 focus:ring-primary/40"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="instagram"
                    disabled={isSubmitting}
                    className="w-full h-12 text-md font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Universal Footer Component */}
      <footer className="mt-16 border-t border-border/30 bg-background/30 backdrop-blur-xl py-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <span className="text-xl font-black text-primary">
                SaveReelAudio
                <span className="text-black dark:text-white">.App</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm font-bold">
              <Link
                to="/privacy"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Terms & Conditions
              </Link>
              <Link
                to="/contact"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>

          <hr className="my-6 border-border/20 w-full" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground max-w-4xl leading-relaxed text-center md:text-left">
              <span className="font-bold text-foreground">SaveReelAudio.App</span> is not
              affiliated with Instagram™ and we do not host any of the media
              on our servers. All the media content is delivered through its
              original source and belongs to their respective owners.
            </p>
            <p className="text-xs text-muted-foreground shrink-0 text-center">
              &copy; 2020-2026 SaveReelAudio - All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

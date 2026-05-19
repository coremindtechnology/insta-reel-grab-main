import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Send, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/contact")({
  component: ContactComponent,
});

function ContactComponent() {
  const [isDark, setIsDark] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

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
                  For support, advertisement inquiries, feature requests, or
                  DMCA copyright takedown requests, please email us directly or
                  use this contact form.
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
                        className="rounded-xl border-border/40 focus:border-primary/50 h-11"
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
                        className="rounded-xl border-border/40 focus:border-primary/50 h-11"
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
                      className="rounded-xl border-border/40 focus:border-primary/50 h-11"
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
                      className="w-full rounded-xl border border-border/40 focus:border-primary/50 focus:outline-none p-3 text-sm bg-background/50 backdrop-blur-sm"
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

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-muted-foreground">
          &copy; 2020-2026 SaveReelAudio - All Rights Reserved.
        </div>
      </div>
    </main>
  );
}

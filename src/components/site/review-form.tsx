"use client";

import { useState } from "react";
import { HeartHandshake, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import { track } from "@/lib/track";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ============================================================
// "Share your experience" — public review / testimonial form.
// Submissions land in the admin Testimonials module as UNPUBLISHED
// rows (source: "public"); the owner approves before they go live.
// Used on product pages and the thank-you page.
// ============================================================

export function ReviewFormDialog({
  open,
  onOpenChange,
  productName,
  context,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fills the "which piece" field — e.g. the product the visitor is viewing. */
  productName?: string;
  /** Analytics context label — "product" or "thank_you". */
  context?: string;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [quote, setQuote] = useState("");
  const [piece, setPiece] = useState(productName ?? "");
  const [company, setCompany] = useState(""); // honeypot — humans never see this
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameError = touched && name.trim().length < 2 ? "Please add your name" : undefined;
  const quoteError = touched && quote.trim().length < 10 ? "A few more words, please (10+ characters)" : undefined;

  async function submit() {
    setTouched(true);
    if (name.trim().length < 2 || quote.trim().length < 10 || submitting) return;
    setSubmitting(true);
    try {
      await api.post("/api/public/testimonials", {
        name: name.trim(),
        location: location.trim(),
        rating,
        quote: quote.trim(),
        productName: (piece || productName || "").trim(),
        company, // honeypot
      });
      track("review_submit", { context: context ?? "site", rating });
      toast({
        title: "Thank you for the love! ♥",
        description: "Your review will appear on the site once Khushi takes a quick look at it.",
      });
      // Reset for next time
      setName("");
      setLocation("");
      setRating(5);
      setQuote("");
      setPiece(productName ?? "");
      setTouched(false);
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Couldn't save your review",
        description: e instanceof Error ? e.message : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto custom-scroll">
        {/* Warm gradient strip — same brand flourish as the inquiry modal. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-gold-soft via-gold to-terracotta"
        />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <HeartHandshake className="size-5 text-terracotta" aria-hidden="true" />
            Share your experience
          </DialogTitle>
          <DialogDescription>
            Received a piece from the studio? Tell other gift-lovers how it went — your words help a small
            handcraft business grow. Reviews appear after a quick check (no editing, we promise).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Star picker — hover + keyboard accessible radios */}
          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">How many hearts? *</p>
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  <Star
                    className={cn(
                      "size-7 transition-colors",
                      n <= (hoverRating || rating) ? "fill-gold text-gold" : "text-border"
                    )}
                    aria-hidden="true"
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground" aria-live="polite">
                {["", "It was okay", "Liked it", "Really liked it", "Loved it!", "Beyond beautiful!"][hoverRating || rating]}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="review-name" className="mb-1.5 block text-sm font-medium text-foreground">
                Your name *
              </label>
              <Input
                id="review-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Priya Sharma"
                maxLength={80}
                aria-required
                aria-invalid={!!nameError}
              />
              {nameError ? <p className="mt-1 text-xs text-destructive">{nameError}</p> : null}
            </div>
            <div>
              <label htmlFor="review-city" className="mb-1.5 block text-sm font-medium text-foreground">
                City <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="review-city"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Surat, Gujarat"
                maxLength={80}
              />
            </div>
          </div>

          <div>
            <label htmlFor="review-quote" className="mb-1.5 block text-sm font-medium text-foreground">
              Your experience *
            </label>
            <Textarea
              id="review-quote"
              rows={4}
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="“The nameplate arrived beautifully packed — my mother teared up seeing her name in gold!”"
              maxLength={600}
              aria-required
              aria-invalid={!!quoteError}
            />
            <div className="mt-1 flex items-center justify-between">
              {quoteError ? <p className="text-xs text-destructive">{quoteError}</p> : <span />}
              <p className="text-[11px] text-muted-foreground">{quote.length}/600</p>
            </div>
          </div>

          <div>
            <label htmlFor="review-piece" className="mb-1.5 block text-sm font-medium text-foreground">
              Which piece was it for? <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="review-piece"
              value={piece}
              onChange={(e) => setPiece(e.target.value)}
              placeholder="Personalized Family Nameplate"
              maxLength={120}
            />
          </div>

          {/* Honeypot — invisible to humans, catches bots */}
          <input
            type="text"
            name="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="pointer-events-none absolute -left-[9999px] size-0 opacity-0"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Maybe later
          </Button>
          <Button onClick={submit} disabled={submitting} className="min-w-32">
            {submitting ? "Sending…" : "Send my review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { InquiryForm } from "@/components/site/inquiry-form";
import { useSiteStore } from "@/lib/store";
import { trackInquiryOpen } from "@/lib/track";

/** Global "Enquire Now" dialog — one instance lives in the SiteApp shell. */
export function InquiryModal() {
  const inquiryOpen = useSiteStore((s) => s.inquiryOpen);
  const closeInquiry = useSiteStore((s) => s.closeInquiry);
  const inquiryContext = useSiteStore((s) => s.inquiryContext);

  // GA4: fire inquiry_open each time the dialog opens (context = product | general).
  useEffect(() => {
    if (!inquiryOpen) return;
    trackInquiryOpen(
      inquiryContext?.productSlug ? "product" : "general",
      inquiryContext?.productSlug,
      inquiryContext?.category
    );
  }, [inquiryOpen, inquiryContext]);

  return (
    <Dialog open={inquiryOpen} onOpenChange={(open) => (open ? null : closeInquiry())}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto custom-scroll sm:max-w-lg">
        {/* Warm brand gradient strip — ties the dialog to the studio palette. */}
        <div
          aria-hidden="true"
          className="-mx-6 -mt-6 mb-5 h-1.5 rounded-t-lg bg-gradient-to-r from-gold-soft via-gold to-terracotta"
        />
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Enquire Now</DialogTitle>
          <DialogDescription>
            {inquiryContext?.productName
              ? "Send this enquiry and we'll get back with details, pricing and timelines."
              : "Tell us what you're looking for — custom designs are our specialty."}
          </DialogDescription>
          {inquiryContext?.productName ? (
            <div className="pt-1">
              <Badge variant="secondary" className="bg-gold-soft text-sm font-medium text-accent-foreground">
                {inquiryContext.productName}
              </Badge>
            </div>
          ) : null}
        </DialogHeader>
        <InquiryForm />
      </DialogContent>
    </Dialog>
  );
}

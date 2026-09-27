"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { JsonLdScript } from "@/lib/seo";
import type { Faq } from "@/lib/types";

interface FaqAccordionProps {
  faqs: Faq[];
  /** Emit FAQPage JSON-LD structured data. */
  withSchema?: boolean;
  className?: string;
}

/** Renders FAQs with the shadcn Accordion + optional FAQPage JSON-LD. */
export function FaqAccordion({ faqs, withSchema = false, className }: FaqAccordionProps) {
  if (!faqs || faqs.length === 0) return null;

  const schema = withSchema
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }
    : null;

  return (
    <div className={className}>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, i) => (
          <AccordionItem key={faq.id || i} value={faq.id || `faq-${i}`}>
            <AccordionTrigger className="text-left text-base font-medium text-foreground hover:text-primary hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {schema ? <JsonLdScript data={schema} /> : null}
    </div>
  );
}

/**
 * Seed sample testimonials so the homepage "Words from Happy Hearts"
 * section has content out of the box. Idempotent: only runs when the
 * Testimonial table is empty.
 *
 * Usage: bun scripts/seed-testimonials.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    location: "Surat, Gujarat",
    rating: 5,
    quote:
      "The nameplate arrived beautifully packed — my mother actually teared up seeing her name in gold. The resin work is so glossy it looks like glass. Worth every rupee!",
    productName: "Personalized Family Nameplate",
    featured: true,
    displayOrder: 1,
  },
  {
    name: "Ananya Deshmukh",
    location: "Pune, Maharashtra",
    rating: 5,
    quote:
      "I ordered a wedding bouquet memory frame and it captured our flowers even better than the fresh ones looked. Khushi kept sending progress photos — such a personal touch.",
    productName: "Wedding Bouquet Memory Frame",
    featured: true,
    displayOrder: 2,
  },
  {
    name: "Rahul Mehta",
    location: "Mumbai, Maharashtra",
    rating: 5,
    quote:
      "Gifted the Diwali hamper to three clients and every single one called to ask where I got it from. Premium feel, custom names, and delivered across India in perfect condition.",
    productName: "Custom Resin Gift Hamper",
    featured: true,
    displayOrder: 3,
  },
  {
    name: "Sneha Patel",
    location: "Ahmedabad, Gujarat",
    rating: 5,
    quote:
      "My Lippan art wall piece is the first thing guests notice now. The colours match my living room perfectly because Khushi customised them without any fuss.",
    productName: "Lippan Art Wall Panel",
    featured: false,
    displayOrder: 4,
  },
  {
    name: "Kavitha Rao",
    location: "Bengaluru, Karnataka",
    rating: 5,
    quote:
      "Ordered first-birthday memory frames for my twins with their tiny handprints preserved. Communication was quick on WhatsApp and the pieces arrived right on the date promised.",
    productName: "First Birthday Memory Frame",
    featured: false,
    displayOrder: 5,
  },
  {
    name: "Meera Joshi",
    location: "Jaipur, Rajasthan",
    rating: 4,
    quote:
      "The terracotta earrings are stunning and so lightweight — I wear them to office almost weekly. Would love more earring designs in this collection!",
    productName: "Terracotta Swirl Statement Earrings",
    featured: false,
    displayOrder: 6,
  },
];

async function main() {
  const existing = await db.testimonial.count();
  if (existing > 0) {
    console.log(`Testimonials already present (${existing}) — skipping seed.`);
    return;
  }
  for (const t of TESTIMONIALS) {
    await db.testimonial.create({ data: t });
  }
  console.log(`Seeded ${TESTIMONIALS.length} testimonials.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

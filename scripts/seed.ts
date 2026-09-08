/**
 * Artistic by Khushi — Database seed
 * Run: bun scripts/seed.ts
 * Creates admin user, settings, homepage sections, categories,
 * products with galleries, blog posts, pages and FAQs.
 */
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

const IMG = (name: string) => `/images/${name}`;

async function main() {
  console.log("Seeding Artistic by Khushi…");

  // Wipe (order matters for FKs)
  await db.lead.deleteMany();
  await db.faq.deleteMany();
  await db.productImage.deleteMany();
  await db.product.deleteMany();
  await db.blogPost.deleteMany();
  await db.blogCategory.deleteMany();
  await db.page.deleteMany();
  await db.category.deleteMany();
  await db.mediaAsset.deleteMany();
  await db.homepageSection.deleteMany();
  await db.siteSetting.deleteMany();
  await db.adminSession.deleteMany();
  await db.adminUser.deleteMany();

  // ---------------- Admin ----------------
  await db.adminUser.create({
    data: {
      email: "admin@artisticbykhushi.com",
      name: "Khushi",
      passwordHash: hashPassword("Khushi@2024"),
      role: "OWNER",
    },
  });
  console.log("✓ Admin user created (admin@artisticbykhushi.com / Khushi@2024)");

  // ---------------- Site settings ----------------
  const settings: Record<string, string> = {
    brandName: "Artistic by Khushi",
    tagline: "Handcrafted Resin Art & Personalized Gifting",
    logoText: "Artistic by Khushi",
    phone: "+91 98765 43210",
    whatsappNumber: "919876543210",
    whatsappMessage: "Hello Khushi! I found your website and I'm interested in your handcrafted resin art. Please share more details.",
    email: "hello@artisticbykhushi.com",
    address: "Studio visits by appointment only",
    city: "Indore",
    state: "Madhya Pradesh",
    serviceAreas: "Indore, Bhopal, Mumbai, Delhi, Pune, Jaipur — shipping across India",
    instagramUrl: "https://instagram.com/artisticbykhushi",
    facebookUrl: "https://facebook.com/artisticbykhushi",
    pinterestUrl: "",
    youtubeUrl: "",
    footerAbout:
      "Artistic by Khushi is a handcrafted resin art studio creating personalized nameplates, home décor, memory keepsakes and custom gifts. Every piece is poured, finished and polished by hand — made with love, one creation at a time.",
    copyrightText: "Artistic by Khushi. All rights reserved.",
    defaultSeoTitle: "Artistic by Khushi | Handcrafted Personalized Resin Art & Gifts",
    defaultMetaDescription:
      "Discover handcrafted resin nameplates, wall art, trays, coasters, keychains, jewellery and memory preservation keepsakes by Artistic by Khushi. Personalized designs made with love. Enquire on WhatsApp.",
    defaultOgImage: IMG("og-default.jpg"),
    googleAnalyticsId: "",
    googleSearchConsoleToken: "",
    googleSheetsWebhookUrl: "",
    headerCtaText: "Enquire Now",
    headerCtaUrl: "#/contact",
    announcements: "✨ Now accepting custom festive & wedding season orders — book early to reserve your date!",
    siteUrl: "",
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.siteSetting.create({ data: { key, value } });
  }
  console.log("✓ Site settings");

  // ---------------- Homepage sections ----------------
  const sections = [
    {
      sectionKey: "hero",
      heading: "Handcrafted Resin Art, Made Just for You",
      subheading:
        "Premium personalized nameplates, décor, keepsakes & gifts — designed around your story, hand-poured with love by Khushi.",
      body: "Each Artistic by Khushi creation is made to order in small batches, using premium epoxy resin, real dried flowers and hand-finished detailing.",
      imageUrl: IMG("hero-main.jpg"),
      ctaText: "Explore Products",
      ctaUrl: "#/products",
      ctaText2: "Enquire Now",
      ctaUrl2: "#/contact",
      itemsJson: "[]",
      displayOrder: 1,
    },
    {
      sectionKey: "brand_intro",
      heading: "Where Memories Become Art",
      subheading: "A small-batch resin art studio from Indore, crafting one-of-a-kind pieces since 2021",
      body:
        "<p>Artistic by Khushi began at a kitchen table — with one mould, a bundle of wedding flowers and a wish to make beautiful things that hold meaning. Today, every nameplate, tray, frame and keepsake that leaves our studio is still made the same way: slowly, carefully, and completely by hand.</p><p>We don't mass-produce. We design each piece around your names, colours, flowers and stories, then pour, cure, sand and polish it over several days so it arrives ready to be treasured for years.</p>",
      imageUrl: IMG("about-studio.jpg"),
      ctaText: "Our Story",
      ctaUrl: "#/about",
      ctaText2: "",
      ctaUrl2: "",
      itemsJson: JSON.stringify([
        { title: "Made to order", text: "No ready-made shelves — every piece starts with your story." },
        { title: "Premium materials", text: "High-grade epoxy resin, UV-resistant finishes, real dried florals." },
        { title: "Hand-finished", text: "Each edge sanded and polished for a gallery-smooth touch." },
      ]),
      displayOrder: 2,
    },
    {
      sectionKey: "why_choose",
      heading: "Why Choose Artistic by Khushi",
      subheading: "The details that make every piece worth keeping",
      body: "",
      imageUrl: "",
      ctaText: "Start Your Custom Order",
      ctaUrl: "#/contact",
      ctaText2: "",
      ctaUrl2: "",
      itemsJson: JSON.stringify([
        { title: "Personalized Designs", text: "Your names, dates, colours and flowers designed into the art — not printed on it." },
        { title: "Premium Resin Finish", text: "Glass-smooth, UV-stabilised epoxy that keeps its clarity and shine for years." },
        { title: "Handmade Craftsmanship", text: "Every piece is poured, cured and finished by hand in our Indore studio." },
        { title: "Custom Colours & Themes", text: "Match your home, wedding palette or brand — terracotta, gold, pastels and more." },
        { title: "Memory Preservation", text: "Wedding bouquets, first birthday keepsakes and milestone memories preserved forever." },
        { title: "Made With Care", text: "Small batches, honest timelines, careful packaging and warm communication." },
      ]),
      displayOrder: 3,
    },
    {
      sectionKey: "custom_orders",
      heading: "Dream It, We'll Craft It",
      subheading: "Custom size, colour, theme, name, design or concept — completely made for you",
      body:
        "<p>Have something specific in mind? A nameplate in your exact entrance palette, a tray matching your dinner set, or a gift that tells someone's whole story? We love custom briefs.</p><p>Share your idea and we'll help you choose the size, colour, theme and finish — then handcraft it exactly for you.</p>",
      imageUrl: IMG("prod-custom-1.jpg"),
      ctaText: "Start Your Custom Order",
      ctaUrl: "#/contact",
      ctaText2: "See Custom Ideas",
      ctaUrl2: "#/category/custom-orders",
      itemsJson: JSON.stringify([
        { title: "Custom size", text: "Any dimension — from mini keychains to statement wall panels." },
        { title: "Custom colour", text: "Match your décor, wedding palette or favourite shade." },
        { title: "Custom theme", text: "Geometric, floral, geode, spiritual, minimal — you name it." },
        { title: "Custom names & text", text: "Names, mantras, quotes, dates or logos in elegant lettering." },
      ]),
      displayOrder: 4,
    },
    {
      sectionKey: "memory_preservation",
      heading: "Preserve the Moments That Matter",
      subheading: "Wedding bouquets, first locks of hair, tiny first-birthday shoes — memories sealed in crystal-clear resin",
      body:
        "<p>Flowers fade. Memories shouldn't. Our memory preservation pieces carefully encase your real bouquet, anniversary roses or baby keepsakes in crystal-clear resin, so the moment that made you emotional stays with you — forever.</p>",
      imageUrl: IMG("cat-memory.jpg"),
      ctaText: "Preserve Your Memory",
      ctaUrl: "#/category/memory-preservation",
      ctaText2: "Enquire on WhatsApp",
      ctaUrl2: "",
      itemsJson: "[]",
      displayOrder: 5,
    },
    {
      sectionKey: "final_cta",
      heading: "Have Something Special in Mind?",
      subheading: "Tell us about your idea — we'll design it, craft it and make it yours.",
      body: "",
      imageUrl: IMG("cta-bg.jpg"),
      ctaText: "Send an Inquiry",
      ctaUrl: "#/contact",
      ctaText2: "WhatsApp Us",
      ctaUrl2: "",
      itemsJson: "[]",
      displayOrder: 6,
    },
  ];
  for (const s of sections) {
    await db.homepageSection.create({ data: s });
  }
  console.log("✓ Homepage sections");

  // ---------------- Categories ----------------
  const categories: {
    key: string;
    name: string;
    slug: string;
    short: string;
    long: string;
    image: string;
    intro: string;
    bottom: string;
    featured: boolean;
    order: number;
    focus: string;
  }[] = [
    {
      key: "nameplates",
      name: "Resin Nameplates",
      slug: "resin-nameplates",
      short: "Personalized nameplates for homes & offices — handcrafted with premium resin, gold lettering and preserved florals.",
      long: "Bespoke resin nameplates designed around your family name, home palette and style. Choose from wooden-backed classic designs, modern minimal blocks or floral-embedded statement pieces.",
      image: IMG("cat-nameplates.jpg"),
      intro:
        "<p>A nameplate is the first hello your home gives. Our handcrafted resin nameplates turn that hello into art — your family name in elegant golden lettering, floated in crystal-clear premium resin alongside real dried flowers, terracotta swirls or gold flakes.</p><p>Every nameplate is custom-made: your text, your fonts, your colour palette, your size. Whether it's a warm wooden-backed classic for your entrance, a sleek block for your office desk, or a couple nameplate for a wedding gift — we craft it to fit beautifully.</p>",
      bottom:
        "<p><strong>How to order your resin nameplate:</strong> share the text, preferred colours and size, and we'll send you a design preview before pouring begins. Most nameplates ship within 7–10 days. Enquire on WhatsApp for a quick quote.</p>",
      featured: true,
      order: 1,
      focus: "resin nameplates",
    },
    {
      key: "mantra",
      name: "Spiritual & Mantra Frames",
      slug: "mantra-frames",
      short: "Devotional resin frames — mantras, Om, Ek Onkar and mandala art for a positive, calm space.",
      long: "Spiritual resin art frames with golden mantras, Om symbols, mandalas and personalized devotional designs — bringing positivity and calm to your home, pooja room or office.",
      image: IMG("cat-mantra-frames.jpg"),
      intro:
        "<p>Bring serenity into your space with our spiritual resin collection — golden mantras, Om symbols and mandala patterns floated in warm amber resin. Each frame is crafted to be both a devotional centrepiece and a piece of art you're proud to display.</p><p>Popular as housewarming and Diwali gifts, these frames can be personalized with your chosen mantra, family deity motif or a Sanskrit shloka close to your heart.</p>",
      bottom:
        "<p>Spiritual frames make meaningful housewarming, Griha Pravesh and festive gifts. Ask us about matching sets for your pooja room or a personalized mantra of your choice.</p>",
      featured: true,
      order: 2,
      focus: "mantra frames",
    },
    {
      key: "lippan",
      name: "Lippan / Mud Mirror Art",
      slug: "lippan-art",
      short: "Traditional Gujarati Lippan mirror art — hand sculpted clay relief with mirrors, made modern.",
      long: "Handcrafted Lippan art panels in the traditional Kutch style — sculpted clay relief patterns with mirrors, offered in classic white, terracotta and modern color palettes.",
      image: IMG("cat-lippan-art.jpg"),
      intro:
        "<p>Lippan art — the beautiful mud-and-mirror craft of Kutch, Gujarat — has decorated Indian homes for generations. Our panels honour the tradition with hand-sculpted clay relief and mirrors, refreshed in palettes that suit modern interiors.</p><p>From classic white-and-mirror motifs to peacock centre-pieces with terracotta borders, each panel is sculpted entirely by hand. Custom motifs, sizes and colours are welcome.</p>",
      bottom:
        "<p>Lippan panels are striking statement pieces for living rooms, entryways and pooja spaces. Custom family motifs, auspicious symbols and matching sets can be made to order.</p>",
      featured: true,
      order: 3,
      focus: "lippan art",
    },
    {
      key: "wallart",
      name: "Resin Wall Art",
      slug: "resin-wall-art",
      short: "Abstract & geode-style resin wall art — fluid gold, terracotta and crystal statement panels.",
      long: "One-of-a-kind resin wall art — fluid abstract pours, geode panels with crystals and gold veins, made to your palette and size.",
      image: IMG("cat-wall-art.jpg"),
      intro:
        "<p>Statement walls deserve statement art. Our resin wall panels are poured in fluid waves of gold, champagne, terracotta and blush — or sculpted into geode masterpieces with real crystal points and gold veining.</p><p>Because resin art is poured by hand, no two panels can ever be identical — your wall art is genuinely one-of-a-kind. Share your room's palette and dimensions and we'll design a piece made for that exact wall.</p>",
      bottom:
        "<p>Wall art is available from compact 12-inch accents to large 4-foot centre-pieces. Custom colour matching to your interiors is our speciality — just share a photo of your wall.</p>",
      featured: true,
      order: 4,
      focus: "resin wall art",
    },
    {
      key: "trays",
      name: "Resin Trays",
      slug: "resin-trays",
      short: "Serving trays & lazy susans in marble, mandala and terrazzo resin — with brass handles.",
      long: "Handcrafted resin serving trays, vanity trays and lazy susans — marble swirls, mandala art and gold-rimmed finishes with optional brass handles.",
      image: IMG("cat-trays.jpg"),
      intro:
        "<p>Serve in style. Our resin trays combine art with utility — ivory marble swirls, terracotta mandalas or terrazzo chips, finished with gold rims and optional brass handles. Perfect for chai sessions, festive hosting, vanity organisation and gifting.</p><p>Choose from round, oval and rectangular shapes in multiple sizes. Matching coaster sets can be crafted to complete the set.</p>",
      bottom:
        "<p>Trays pair beautifully with our coasters and nameplates for coordinated gifting. Festive and wedding-season hampers are available — enquire early for bulk dates.</p>",
      featured: true,
      order: 5,
      focus: "resin trays",
    },
    {
      key: "coasters",
      name: "Resin Coasters",
      slug: "resin-coasters",
      short: "Hexagonal, square & terrazzo coaster sets with real pressed flowers and gold edges.",
      long: "Handcrafted resin coaster sets — hexagonal florals, terrazzo monograms and gold-edge finishes in gift-ready packaging.",
      image: IMG("cat-coasters.jpg"),
      intro:
        "<p>Coasters are the smallest canvas with the biggest charm. Our sets feature real pressed flowers, gold edges, terrazzo chips and monogram letters — each coaster sealed in glossy, heat-safe premium resin.</p><p>Sets come in hexagonal, square and round shapes with matching holders. Add a monogram or family name to make them truly yours — or gift-ready boxes for weddings and festive giving.</p>",
      bottom:
        "<p>Coaster sets are our most gifted item — perfect for housewarmings, birthdays and corporate gifting. Bulk and custom-monogram orders welcome.</p>",
      featured: true,
      order: 6,
      focus: "resin coasters",
    },
    {
      key: "keychains",
      name: "Resin Keychains",
      slug: "resin-keychains",
      short: "Personalized keychains with initials, name waves, dried flowers & glitter — sweet little gifts.",
      long: "Custom resin keychains — initials, name waves, hearts, roses and matching couple sets in gold and colour palettes of your choice.",
      image: IMG("cat-keychains.jpg"),
      intro:
        "<p>Small tokens, big smiles. Our resin keychains carry initials, name waves, preserved petals and gold glitter — on sturdy rings that survive daily use. Matching couple sets and bulk return-gift orders are a studio favourite.</p><p>Pick your shape, colours and text; we'll craft singles, pairs or party batches. Popular for return gifts, proposals and friendship day.</p>",
      bottom:
        "<p>Bulk orders (10+ pieces) get a special rate and coordinated packaging. Share your event date and theme for a matching set.</p>",
      featured: false,
      order: 7,
      focus: "resin keychains",
    },
    {
      key: "jewellery",
      name: "Resin Jewellery",
      slug: "resin-jewellery",
      short: "Statement earrings, pendants & bangles — wearable resin art with florals and gold leaf.",
      long: "Handcrafted resin jewellery — statement earrings, dainty studs, pendants and bangles with pressed flowers, gold leaf and ink swirls.",
      image: IMG("cat-jewellery.jpg"),
      intro:
        "<p>Wearable art, feather-light on the ears. Our resin jewellery line carries pressed flowers, gold leaf and swirling inks in glossy settings — from statement terracotta earrings to dainty floral studs and teardrop pendants.</p><p>Each piece is finished with hypoallergenic gold-plated hooks and chains. Custom colour matching to your outfit is available — share a photo of your ensemble.</p>",
      bottom:
        "<p>Bridal and festive jewellery sets can be crafted to match your outfit palette. Enquire early with your date so we can cure and finish perfectly.</p>",
      featured: false,
      order: 8,
      focus: "resin jewellery",
    },
    {
      key: "memory",
      name: "Memory Preservation",
      slug: "memory-preservation",
      short: "Wedding bouquets & milestone keepsakes preserved forever in crystal-clear resin.",
      long: "Memory preservation art — your real wedding bouquet, anniversary roses and baby keepsakes encased forever in museum-grade clear resin.",
      image: IMG("cat-memory.jpg"),
      intro:
        "<p>Some moments deserve more than a photograph. Our memory preservation pieces carefully encase your real flowers and keepsakes — a wedding bouquet, proposal roses, first birthday cap and shoes, a loved one's cherished item — in crystal-clear resin that never yellows.</p><p>Send us your preserved flowers (or we'll guide you through pressing them), and we'll design a heart, frame or block that keeps that day within reach, forever.</p>",
      bottom:
        "<p>Memory orders need extra care: flowers must be fully dried (we guide you), and curing takes longer. Reserve your slot 3–4 weeks before your occasion where possible.</p>",
      featured: true,
      order: 9,
      focus: "memory preservation resin",
    },
    {
      key: "custom",
      name: "Custom Orders",
      slug: "custom-orders",
      short: "Anything you dream — custom size, colour, theme, name and design, handcrafted to brief.",
      long: "Fully custom resin commissions — share your idea, size, palette and theme and we'll design and handcraft it to brief.",
      image: IMG("cat-custom.jpg"),
      intro:
        "<p>If you can imagine it, we can probably pour it. Custom orders are where our studio is happiest — corporate logos, pet portraits in resin, matching wedding favour sets, anniversary countdown gifts, or a one-of-one piece nobody else will ever own.</p><p>Share your brief with sizes, colours, themes and photos of the space or person it's for. We'll respond with a design plan, timeline and honest advice on what will look best.</p>",
      bottom:
        "<p>Custom commissions begin with a quick chat on WhatsApp. We take a limited number of custom slots each month to keep quality high — book early.</p>",
      featured: false,
      order: 10,
      focus: "custom resin art",
    },
  ];

  const catIdByKey = new Map<string, string>();
  for (const c of categories) {
    const created = await db.category.create({
      data: {
        name: c.name,
        slug: c.slug,
        shortDescription: c.short,
        longDescription: c.long,
        imageUrl: c.image,
        imageAlt: `${c.name} handcrafted by Artistic by Khushi`,
        introContent: c.intro,
        bottomContent: c.bottom,
        featured: c.featured,
        displayOrder: c.order,
        published: true,
        focusKeyword: c.focus,
        metaDescription: `${c.short} Handcrafted by Artistic by Khushi — personalized, premium and made to order. Enquire now.`,
      },
    });
    catIdByKey.set(c.key, created.id);
  }
  console.log("✓ Categories");

  // ---------------- Products ----------------
  type SeedProduct = {
    catKey: string;
    name: string;
    slug: string;
    sku: string;
    short: string;
    long: string;
    highlights: string[];
    customization: string[];
    size: string;
    material: string;
    colour: string;
    occasion: string;
    care: string;
    tags: string;
    featured: boolean;
    images: { url: string; alt: string; caption: string }[];
    faqs?: { q: string; a: string }[];
  };

  const products: SeedProduct[] = [
    {
      catKey: "nameplates",
      name: "Personalized Family Resin Nameplate",
      slug: "personalized-resin-nameplate",
      sku: "ABK-NP-001",
      short: "Your family name in golden lettering, floated in crystal-clear resin with real dried flowers and gold flakes — mounted on rich wooden backing.",
      long:
        "<p>The signature Artistic by Khushi nameplate. Your family name is rendered in elegant golden lettering, then floated in crystal-clear, UV-stabilised resin alongside real dried flowers, terracotta swirls and delicate gold flakes. The rich espresso-toned resin base gives a premium depth that printed nameplates simply can't match.</p><p>Every plate is made to order — your text, your font style, your palette. Holes are pre-drilled for easy mounting, and each piece arrives carefully packaged with hanging hardware and a care card.</p>",
      highlights: [
        "Custom family name, house number or mantra in golden lettering",
        "Real preserved dried flowers & premium gold flakes",
        "Rich espresso resin base with clear glossy top layer",
        "Weather-resistant UV-stabilised finish",
        "Pre-fitted with hanging hooks — mounts in minutes",
      ],
      customization: ["Family name / text of your choice", "Font style & letter finish (gold / copper / silver)", "Base colour palette", "Floral or geometric inlay theme", "Custom size for your entrance"],
      size: "Standard 18 × 9 in (custom sizes available)",
      material: "Premium epoxy resin, real dried florals, wooden backing",
      colour: "Espresso brown with gold & clear top",
      occasion: "Housewarming, Griha Pravesh, new home",
      care: "Wipe with a soft dry cloth. Avoid direct harsh sunlight and abrasive cleaners.",
      tags: "nameplate, housewarming gift, personalized, resin nameplate, home entrance",
      featured: true,
      images: [
        { url: IMG("prod-nameplate-1.jpg"), alt: "Personalized family resin nameplate with golden lettering and dried flowers", caption: "Sharma Residence — espresso & gold with preserved florals" },
        { url: IMG("cat-nameplates.jpg"), alt: "Resin nameplate with gold letters and clear glossy finish", caption: "Crystal-clear top layer over golden lettering" },
      ],
      faqs: [
        { q: "Can the nameplate survive outdoor weather?", a: "Yes — we use UV-stabilised resin and seal the backing. For fully exposed entrances we recommend a shaded placement for the longest life." },
        { q: "How do I send my family name and font choice?", a: "After enquiring, we'll share a short design form plus a preview mockup before pouring. Nothing is made until you approve the design." },
      ],
    },
    {
      catKey: "nameplates",
      name: "Couple Name Resin Nameplate",
      slug: "couple-name-resin-nameplate",
      sku: "ABK-NP-002",
      short: "Two names, one heart — blush pink and cream resin waves with golden couple names, made for wedding gifts.",
      long:
        "<p>Made for weddings, anniversaries and new beginnings. Two names flow together over blush-pink and cream resin waves, joined by a delicate golden heart. The soft palette photographs beautifully and suits modern, minimal interiors.</p><p>Add a wedding date beneath the names for a keepsake the couple will keep forever. Gift-wrapping available.</p>",
      highlights: [
        "Two custom names with optional wedding date",
        "Blush pink & cream wave palette",
        "Golden heart accent and lettering",
        "Wedding-gift ready packaging",
      ],
      customization: ["Both names & date", "Palette (blush / ivory / sage / terracotta)", "Heart or infinity accent", "Size & orientation"],
      size: "Standard 16 × 8 in",
      material: "Premium epoxy resin, gold foil accents",
      colour: "Blush pink & cream",
      occasion: "Weddings, anniversaries, engagement",
      care: "Dust with a soft cloth; keep away from prolonged direct sunlight.",
      tags: "couple nameplate, wedding gift, anniversary, resin art",
      featured: true,
      images: [
        { url: IMG("prod-nameplate-2.jpg"), alt: "Couple name resin nameplate in blush pink and cream with gold heart", caption: "Aarav + Meera — blush waves with golden heart" },
      ],
    },
    {
      catKey: "nameplates",
      name: "Executive Office Nameplate",
      slug: "office-desk-nameplate",
      sku: "ABK-NP-003",
      short: "Sleek desk-block nameplate in matte charcoal and gold — for desks, clinics and receptions.",
      long:
        "<p>A quiet statement for professional spaces. This freestanding desk block pairs matte charcoal resin with brass-style lettering — your name, designation or clinic name in a clean modern layout. Weighted base keeps it steady on desks and reception counters.</p>",
      highlights: ["Freestanding weighted desk block", "Matte charcoal with brass-style lettering", "Name, designation or clinic branding", "Lacquered smudge-resistant finish"],
      customization: ["Text lines (name / designation)", "Letter finish", "Logo inlay for clinics & offices", "Block size"],
      size: "10 × 3 in desk block",
      material: "Premium epoxy resin",
      colour: "Matte charcoal & gold",
      occasion: "Professional gifting, clinic branding",
      care: "Wipe gently with a dry microfibre cloth.",
      tags: "office nameplate, desk nameplate, professional gift",
      featured: false,
      images: [
        { url: IMG("prod-nameplate-office.jpg"), alt: "Executive office desk nameplate in charcoal resin with brass letters", caption: "Matte charcoal & brass — executive edition" },
      ],
    },
    {
      catKey: "mantra",
      name: "Gayatri Mantra Resin Frame",
      slug: "gayatri-mantra-resin-frame",
      sku: "ABK-MF-001",
      short: "The Gayatri Mantra in flowing gold calligraphy on ivory resin, framed with a subtle mandala border.",
      long:
        "<p>The Gayatri Mantra carries light, and so does this frame. Rendered in flowing gold calligraphy on warm ivory resin, it is bordered by a subtle mandala pattern that catches the eye without overwhelming a calm space. Ideal for pooja rooms, entrances and meditation corners.</p>",
      highlights: ["Complete Gayatri Mantra in gold calligraphy", "Ivory resin with mandala border", "Ready-to-hang gallery frame", "Housewarming & Diwali favourite"],
      customization: ["Mantra or shloka of your choice", "Frame size & colour", "Add family name or deity motif"],
      size: "14 × 11 in framed",
      material: "Epoxy resin art panel, wooden frame",
      colour: "Ivory & gold",
      occasion: "Housewarming, Diwali, Griha Pravesh",
      care: "Soft dry cloth only; avoid hanging in direct harsh sunlight.",
      tags: "gayatri mantra, spiritual frame, pooja room decor, diwali gift",
      featured: true,
      images: [
        { url: IMG("prod-mantra-1.jpg"), alt: "Gayatri Mantra gold calligraphy on ivory resin frame", caption: "Gold calligraphy on ivory with mandala border" },
      ],
      faqs: [
        { q: "Can I get a different mantra?", a: "Yes — any mantra, shloka or Sanskrit verse can be calligraphed. Share the text at enquiry and we'll confirm the layout in your design preview." },
      ],
    },
    {
      catKey: "mantra",
      name: "Ek Onkar Resin Wall Frame",
      slug: "ek-onkar-resin-frame",
      sku: "ABK-MF-002",
      short: "The Ik Onkar symbol in luminous golden resin over a cream-amber marbled background — a serene spiritual gift.",
      long:
        "<p>Ik Onkar, rendered in luminous gold over cream and amber marbled resin — a serene piece for Sikh households and a deeply meaningful gift for Gurpurab, weddings and housewarmings. Each background is hand-marbled, so every frame is unique.</p>",
      highlights: ["Ik Onkar in golden resin relief", "Hand-marbled cream-amber background", "Ready to hang or gift", "Meaningful Gurpurab & wedding gift"],
      customization: ["Background palette", "Frame size", "Add family name beneath"],
      size: "12 × 12 in",
      material: "Epoxy resin, wooden frame",
      colour: "Cream, amber & gold",
      occasion: "Gurpurab, weddings, housewarming",
      care: "Dust with dry cloth.",
      tags: "ek onkar, ik onkar, sikh gift, spiritual wall art",
      featured: false,
      images: [
        { url: IMG("prod-mantra-2.jpg"), alt: "Ek Onkar golden symbol on cream amber marble resin frame", caption: "Ik Onkar on hand-marbled amber" },
      ],
    },
    {
      catKey: "lippan",
      name: "Peacock Lippan Mirror Art Panel",
      slug: "peacock-lippan-art-panel",
      sku: "ABK-LA-001",
      short: "A majestic peacock motif in hand-sculpted clay relief with mirrors — traditional Kutch Lippan art with a terracotta border.",
      long:
        "<p>Our most loved Lippan panel: a majestic peacock rendered in traditional hand-sculpted clay relief, its feathers dotted with mirrors that glitter as light moves across the room. The terracotta border grounds the piece in Kutchi craft tradition while suiting contemporary walls.</p><p>Sculpted entirely by hand — no moulds — in a process that takes several patient days.</p>",
      highlights: ["Hand-sculpted clay relief (no moulds)", "Mirror-inlaid peacock motif", "Terracotta & cream palette", "Statement size for living rooms & entryways"],
      customization: ["Motif (peacock / floral / elephant / custom)", "Palette", "Panel size"],
      size: "24 × 24 in (custom up to 48 in)",
      material: "Natural clay relief, mirrors, resin-sealed finish",
      colour: "White, cream & terracotta",
      occasion: "Housewarming, weddings, festive décor",
      care: "Dust gently; mirrors can be wiped with a soft damp cloth.",
      tags: "lippan art, mud mirror art, kutch craft, wall panel",
      featured: true,
      images: [
        { url: IMG("prod-lippan-1.jpg"), alt: "Peacock Lippan mud mirror art wall panel with terracotta border", caption: "Peacock motif — hand-sculpted with mirrors" },
      ],
    },
    {
      catKey: "wallart",
      name: "Golden Tides Abstract Resin Wall Art",
      slug: "golden-tides-resin-wall-art",
      sku: "ABK-WA-001",
      short: "Champagne-gold and terracotta waves poured in fluid resin — a one-of-one statement panel for your living room.",
      long:
        "<p>Golden Tides pours champagne gold and terracotta in layered waves over a crisp white base — fluid art that no one else will ever own, because each pour is unrepeatable. A statement piece sized for sofas, consoles and headboards.</p><p>Share your room palette and we'll tune the wave colours to your interior before pouring.</p>",
      highlights: ["One-of-one — unrepeatable fluid pour", "Champagne gold, terracotta & blush palette", "Gallery-depth glossy finish", "Custom palettes to match your room"],
      customization: ["Colour palette", "Size & orientation", "Horizontal or wave direction"],
      size: "36 × 24 in (custom sizes)",
      material: "Epoxy resin on art panel",
      colour: "Champagne gold, terracotta, blush",
      occasion: "Home makeovers, anniversary gifting",
      care: "Dust with a soft dry cloth; avoid direct harsh sunlight.",
      tags: "resin wall art, abstract art, fluid art, living room decor",
      featured: true,
      images: [
        { url: IMG("prod-wall-art-1.jpg"), alt: "Abstract resin wall art with champagne gold and terracotta waves", caption: "Golden Tides — fluid pour in champagne & terracotta" },
        { url: IMG("cat-wall-art.jpg"), alt: "Glossy resin wall art panel with gold swirls", caption: "Glossy gallery-depth finish" },
      ],
    },
    {
      catKey: "wallart",
      name: "Geode Crystal Resin Wall Art",
      slug: "geode-crystal-resin-wall-art",
      sku: "ABK-WA-002",
      short: "Geode-style panel with real crystal points and gold veins — luxury mineral art for feature walls.",
      long:
        "<p>A mineral masterpiece: geode-style resin art with genuine crystal points, gold veining and a caramel-cream gradient. Texture you can feel, sparkle that changes with the light — the definition of a feature-wall centrepiece.</p>",
      highlights: ["Real crystal points & clusters", "Hand-laid gold veining", "Textured, dimensional surface", "Made to your wall's palette"],
      customization: ["Crystal colour family", "Vein intensity (delicate / bold)", "Panel size"],
      size: "30 × 30 in (custom sizes)",
      material: "Epoxy resin, natural crystals, gold leaf",
      colour: "Cream, caramel & gold",
      occasion: "Luxury gifting, home & office makeovers",
      care: "Dust crystals gently with a soft brush.",
      tags: "geode art, crystal wall art, luxury decor, resin art",
      featured: false,
      images: [
        { url: IMG("prod-wall-art-2.jpg"), alt: "Geode style resin wall art with crystal points and gold veins", caption: "Geode panel with real crystals & gold veins" },
      ],
    },
    {
      catKey: "trays",
      name: "Ivory Marble Resin Serving Tray",
      slug: "ivory-marble-resin-tray",
      sku: "ABK-TR-001",
      short: "Ivory-gold marble swirls with brass handles — serve chai, breakfasts or festive sweets in art.",
      long:
        "<p>The host's favourite. Swirling ivory and gold marble resin, finished with a gold rim and elegant brass handles. Generously sized for chai sessions, breakfast-in-bed moments and festive hosting — and just as beautiful styled on an ottoman.</p>",
      highlights: ["Ivory-gold marble swirls (each unique)", "Brass handles & gold rim", "Food-safe sealed surface", "Pairs with matching coaster sets"],
      customization: ["Marble palette", "Handle finish", "Add a family monogram", "Shape (oval / round / rectangle)"],
      size: "16 × 12 in",
      material: "Epoxy resin, brass handles",
      colour: "Ivory & gold",
      occasion: "Housewarming, weddings, festive hosting",
      care: "Hand-wash gently; not dishwasher or microwave safe.",
      tags: "resin tray, serving tray, marble tray, hosting gift",
      featured: true,
      images: [
        { url: IMG("prod-tray-1.jpg"), alt: "Ivory marble resin serving tray with brass handles styled with teacups", caption: "Ivory marble with brass handles" },
      ],
    },
    {
      catKey: "trays",
      name: "Terracotta Mandala Lazy Susan",
      slug: "terracotta-mandala-lazy-susan",
      sku: "ABK-TR-002",
      short: "A rotating mandala for your dining table — terracotta art with a gold rim, made for shared meals.",
      long:
        "<p>Turn every meal into a small ceremony. This 18-inch lazy susan carries a hand-poured terracotta mandala with a gold rim, rotating smoothly on a sealed bearing base — ideal for family dinners and festive tables.</p>",
      highlights: ["Hand-poured terracotta mandala", "Smooth sealed rotating bearing", "18-inch shared-meal size", "Gold rim finish"],
      customization: ["Mandala palette", "Diameter", "Add family initial at centre"],
      size: "18 in diameter",
      material: "Epoxy resin, rotating bearing base",
      colour: "Terracotta & gold",
      occasion: "Wedding gifts, festive tables",
      care: "Wipe clean; avoid cutting directly on the surface.",
      tags: "lazy susan, mandala tray, dining table decor",
      featured: false,
      images: [
        { url: IMG("prod-tray-2.jpg"), alt: "Round terracotta mandala resin lazy susan tray with gold rim", caption: "Terracotta mandala with gold rim" },
      ],
    },
    {
      catKey: "coasters",
      name: "Pressed Flower Hexagon Coaster Set",
      slug: "pressed-flower-coaster-set",
      sku: "ABK-CS-001",
      short: "Six hexagonal coasters with real pressed dried flowers and gold edges — plus matching holder.",
      long:
        "<p>Real pressed daisies, ferns and baby's breath, sealed forever in glossy hexagonal resin with hand-finished gold edges. This six-piece set (with matching holder) is our most gifted piece — beautiful, useful, and priced to make you look generous.</p>",
      highlights: ["Real pressed flowers — no two sets alike", "Six coasters + matching holder", "Gold-edge finish", "Gift-box packaging available"],
      customization: ["Flower palette (warm / pastel / wild)", "Gold or copper edges", "Add monogram to holder", "Set size (4 / 6 / 8)"],
      size: "4 in hexagons, set of 6",
      material: "Epoxy resin, real dried flowers",
      colour: "Clear with florals & gold",
      occasion: "Housewarmings, birthdays, corporate gifting",
      care: "Wipe with a damp cloth; keep away from hot pans.",
      tags: "resin coasters, flower coasters, gift set, housewarming",
      featured: true,
      images: [
        { url: IMG("prod-coaster-1.jpg"), alt: "Hexagonal resin coaster set with pressed dried flowers and gold edges", caption: "Real pressed flowers, gold edges" },
      ],
      faqs: [
        { q: "Can I order matching sets for return gifts?", a: "Yes — sets of 10+ carry a special rate and coordinated packaging. Share your event date at enquiry." },
      ],
    },
    {
      catKey: "coasters",
      name: "Terrazzo Monogram Coaster Set",
      slug: "terrazzo-monogram-coaster-set",
      sku: "ABK-CS-002",
      short: "White-gold terrazzo squares with your monogram in gold — modern minimalism in resin.",
      long:
        "<p>For minimal modern homes: square terrazzo coasters in white and gold chip-fleck, centred with your monogram letter. Comes in a keepsake gift box — a favourite for weddings and corporate gifting.</p>",
      highlights: ["Terrazzo chip-fleck design", "Your monogram letter in gold", "Keepsake gift box included", "Modern square profile"],
      customization: ["Monogram letter", "Chip palette", "Box colour & ribbon"],
      size: "4 in squares, set of 4",
      material: "Epoxy resin",
      colour: "White & gold terrazzo",
      occasion: "Weddings, corporate gifting",
      care: "Wipe clean with a soft cloth.",
      tags: "terrazzo coasters, monogram gift, minimal coasters",
      featured: false,
      images: [
        { url: IMG("prod-coaster-2.jpg"), alt: "Terrazzo monogram resin coasters in white and gold with gift box", caption: "Terrazzo with golden monogram" },
      ],
    },
    {
      catKey: "keychains",
      name: "Rose Heart Resin Keychain",
      slug: "rose-heart-resin-keychain",
      sku: "ABK-KC-001",
      short: "A heart of preserved red rose petals with gold glitter and your initial — a tiny gift that lands big.",
      long:
        "<p>Preserved red rose petals and warm gold glitter, sealed in a glossy heart with your chosen initial charm. Small enough for a pocket, sentimental enough to be kept for years — our top pick for proposals, Valentine's and little apologies.</p>",
      highlights: ["Real preserved rose petals", "Gold glitter border & initial charm", "Sturdy gold-tone ring", "Single or pair"],
      customization: ["Initial / short name", "Petal colour", "Single or matching pair"],
      size: "2.2 in heart",
      material: "Epoxy resin, dried rose petals",
      colour: "Rose red & gold",
      occasion: "Valentine's, proposals, anniversaries",
      care: "Wipe gently; avoid prolonged water exposure.",
      tags: "resin keychain, rose keychain, valentine gift",
      featured: false,
      images: [
        { url: IMG("prod-keychain-1.jpg"), alt: "Heart shaped resin keychain with red rose petals and gold glitter", caption: "Rose heart with golden initial" },
      ],
    },
    {
      catKey: "keychains",
      name: "Couple Name Wave Keychains",
      slug: "couple-name-keychains",
      sku: "ABK-KC-002",
      short: "Two halves of one design — your names in gold waves, made as a matching couple set.",
      long:
        "<p>Two keychains that only make full sense together. Each half carries one name in golden lettering over matching wave palettes — a favourite for anniversaries, long-distance pairs and wedding favour hampers.</p>",
      highlights: ["Matching couple set", "Names engraved in gold", "Coordinated wave palette", "Bulk wedding-favour pricing"],
      customization: ["Both names", "Palette", "Shape (waves / puzzle / hearts)"],
      size: "2.5 in each",
      material: "Epoxy resin, gold-tone hardware",
      colour: "Choose your palette",
      occasion: "Anniversaries, weddings, long-distance",
      care: "Wipe gently with dry cloth.",
      tags: "couple keychain, matching keychain, anniversary gift",
      featured: false,
      images: [
        { url: IMG("prod-keychain-2.jpg"), alt: "Couple matching resin keychains with golden names", caption: "Two halves, one design" },
      ],
    },
    {
      catKey: "jewellery",
      name: "Terracotta Swirl Statement Earrings",
      slug: "terracotta-statement-earrings",
      sku: "ABK-JW-001",
      short: "Bold resin drops with terracotta and gold ink swirls — feather-light statement wear.",
      long:
        "<p>Statement presence without the weight. These resin drops swirl terracotta and gold inks in patterns that echo hand-painted ceramics — finished on gold-plated hypoallergenic hooks. Each pair is one-of-one.</p>",
      highlights: ["Feather-light resin drops", "Terracotta & gold ink swirls", "Gold-plated hypoallergenic hooks", "One-of-one patterns"],
      customization: ["Palette to match your outfit", "Drop length"],
      size: "2.5 in drop",
      material: "Epoxy resin, gold-plated hooks",
      colour: "Terracotta & gold",
      occasion: "Festive wear, gifting",
      care: "Store away from sunlight; wipe with dry cloth.",
      tags: "resin earrings, statement earrings, terracotta jewellery",
      featured: true,
      images: [
        { url: IMG("prod-earrings-1.jpg"), alt: "Statement resin drop earrings with terracotta gold swirls on cream stand", caption: "Terracotta swirls — feather-light" },
      ],
    },
    {
      catKey: "jewellery",
      name: "Dainty Pressed Flower Studs",
      slug: "pressed-flower-stud-earrings",
      sku: "ABK-JW-002",
      short: "Tiny pressed flowers and gold leaf in clear resin studs — everyday minimalism with a secret garden.",
      long:
        "<p>A secret garden for your ears. Tiny pressed flowers float with gold leaf inside clear glossy studs — so subtle that colleagues lean in to look twice. Hypoallergenic posts, everyday comfort.</p>",
      highlights: ["Real tiny pressed flowers", "Gold leaf accents", "Hypoallergenic posts", "Everyday feather-light comfort"],
      customization: ["Flower type & palette", "Gold or silver finish"],
      size: "0.4 in studs",
      material: "Epoxy resin, real dried flowers",
      colour: "Clear with florals",
      occasion: "Daily wear, bridesmaid gifts",
      care: "Wipe gently; remove before bathing.",
      tags: "resin studs, flower earrings, minimal jewellery",
      featured: false,
      images: [
        { url: IMG("prod-earrings-2.jpg"), alt: "Dainty resin stud earrings with tiny pressed flowers and gold leaf", caption: "Tiny florals, gold leaf" },
      ],
    },
    {
      catKey: "jewellery",
      name: "Gold Leaf Teardrop Pendant",
      slug: "gold-leaf-teardrop-pendant",
      sku: "ABK-JW-003",
      short: "A teardrop of clear resin with dancing gold leaf and baby's breath, on a fine gold chain.",
      long:
        "<p>Gold leaf dances like sunlight in water inside this clear teardrop, with a single sprig of baby's breath for softness. Strung on a fine gold-tone chain with an adjustable clasp — layering-friendly and quietly luxurious.</p>",
      highlights: ["Dancing gold leaf inlay", "Real baby's breath sprig", "Adjustable gold-tone chain", "Layering-friendly length"],
      customization: ["Chain length", "Floral inlay choice"],
      size: "1.4 in pendant",
      material: "Epoxy resin, gold leaf, gold-tone chain",
      colour: "Clear & gold",
      occasion: "Birthdays, anniversaries",
      care: "Store flat away from sunlight.",
      tags: "resin pendant, gold leaf necklace, handmade jewellery",
      featured: false,
      images: [
        { url: IMG("prod-pendant-1.jpg"), alt: "Resin teardrop pendant with gold leaf and dried flowers on gold chain", caption: "Gold leaf teardrop" },
      ],
    },
    {
      catKey: "jewellery",
      name: "Ivory & Gold Resin Bangle",
      slug: "ivory-gold-resin-bangle",
      sku: "ABK-JW-004",
      short: "A glossy ivory bangle veined with gold and inlaid dried florals — festive elegance, made to your size.",
      long:
        "<p>Glossy ivory resin veined with gold and carrying delicate dried florals — a bangle that pairs with everything from saris to denim. Crafted in standard and custom wrist sizes, with a piano-lacquer finish.</p>",
      highlights: ["Glossy ivory with gold veins", "Real floral inlay", "Made-to-measure sizes", "Piano-lacquer polish"],
      customization: ["Bangle size", "Palette & inlay", "Set of 2 or pair"],
      size: "Sizes 2.4 – 2.8 in",
      material: "Epoxy resin, dried florals",
      colour: "Ivory & gold",
      occasion: "Festive, weddings",
      care: "Wear with care; store away from direct heat.",
      tags: "resin bangle, festive jewellery, ivory gold",
      featured: false,
      images: [
        { url: IMG("prod-bracelet-1.jpg"), alt: "Glossy ivory resin bangle with gold veins and dried flower inlay", caption: "Ivory & gold, made to size" },
      ],
    },
    {
      catKey: "memory",
      name: "Wedding Bouquet Memory Heart",
      slug: "wedding-bouquet-memory-heart",
      sku: "ABK-MP-001",
      short: "Your actual wedding bouquet flowers, preserved in a crystal-clear resin heart with a gold edge.",
      long:
        "<p>The bouquet you carried down the aisle shouldn't end in a bin. Send us your preserved wedding flowers and we'll design them into a crystal-clear resin heart with a golden edge — the centrepiece of a memory shelf, and the gift that makes newly-weds cry happy tears.</p><p>We guide you through prepping and couriering the flowers, then share a layout preview before casting.</p>",
      highlights: ["Your real wedding flowers preserved forever", "Crystal-clear non-yellowing resin", "Golden edge with optional names & date", "Layout preview before casting"],
      customization: ["Flowers from your bouquet", "Names & wedding date engraving", "Heart / frame / block shape"],
      size: "8 in heart",
      material: "Museum-grade epoxy resin, real bouquet flowers",
      colour: "Clear with your florals",
      occasion: "Weddings, anniversaries",
      care: "Keep away from direct harsh sunlight; dust gently.",
      tags: "memory preservation, wedding bouquet, keepsake, wedding gift",
      featured: true,
      images: [
        { url: IMG("prod-memory-1.jpg"), alt: "Wedding bouquet flowers preserved in clear resin heart keepsake with gold edge", caption: "Your bouquet, forever" },
      ],
      faqs: [
        { q: "How do I send my bouquet flowers?", a: "After enquiring, we share a simple pressing & packaging guide. Couriers across India are fine — flowers travel well when dried correctly." },
        { q: "How far in advance should I book?", a: "Memory slots need 3–4 weeks (drying + curing). For wedding-season orders, book 2 months ahead." },
      ],
    },
    {
      catKey: "memory",
      name: "First Birthday Memory Box Frame",
      slug: "first-birthday-memory-frame",
      sku: "ABK-MP-002",
      short: "Tiny first shoes, hospital cap and photos from day one — preserved in one heirloom resin frame.",
      long:
        "<p>They grow so fast. This heirloom frame preserves the tiny shoes, the hospital cap, the first curl or photos from day one — arranged in clear resin with your baby's name and birth date in gold. The first-birthday gift that parents keep forever.</p>",
      highlights: ["Preserves first shoes, cap, curls & photos", "Baby's name & birth date in gold", "Cream-gold heirloom palette", "Wall or shelf display"],
      customization: ["Items to preserve", "Name & date text", "Frame size"],
      size: "16 × 12 in frame",
      material: "Epoxy resin, keepsake items, wooden frame",
      colour: "Cream & gold",
      occasion: "First birthdays, naming ceremonies",
      care: "Dust gently; avoid wall placement in direct sun.",
      tags: "memory frame, first birthday, baby keepsake",
      featured: false,
      images: [
        { url: IMG("prod-memory-2.jpg"), alt: "First birthday memory box frame with baby shoes and photos preserved in resin", caption: "Day one, preserved forever" },
      ],
    },
    {
      catKey: "memory",
      name: "Anniversary Rose Memory Frame",
      slug: "anniversary-rose-memory-frame",
      sku: "ABK-MP-003",
      short: "Proposal or anniversary roses with your initials and date — romance, preserved in resin.",
      long:
        "<p>Those roses carried a moment. Preserve them. This frame encases your proposal or anniversary roses in crystal-clear resin with couple initials and a golden date — a quiet daily reminder of the yes, the year, and everything since.</p>",
      highlights: ["Preserves your real roses", "Couple initials & date in gold", "Clear non-yellowing resin", "Anniversary & Valentine favourite"],
      customization: ["Your roses & count", "Initials, date & message", "Frame shape & size"],
      size: "12 × 9 in frame",
      material: "Epoxy resin, real roses, wooden frame",
      colour: "Clear with rose tones",
      occasion: "Anniversaries, Valentine's",
      care: "Dust with a dry cloth.",
      tags: "anniversary gift, rose preservation, resin frame",
      featured: true,
      images: [
        { url: IMG("prod-memory-3.jpg"), alt: "Preserved proposal roses in clear resin frame with couple initials in gold", caption: "The moment, kept" },
      ],
    },
    {
      catKey: "custom",
      name: "Custom Resin Gift Hamper",
      slug: "custom-resin-gift-hamper",
      sku: "ABK-CO-001",
      short: "A coordinated set — nameplate, coasters, keychain and frame in one matching palette, boxed to gift.",
      long:
        "<p>The whole story in one box. We design a matching nameplate, coaster set, keychain and small frame in your chosen palette — for weddings, corporate gifting, anniversaries and 'just because' someone deserves everything at once.</p><p>Share the occasion, budget and palette; we'll build the hamper composition and quote before making anything.</p>",
      highlights: ["Coordinated multi-piece composition", "One matching palette across all pieces", "Premium gift box & ribbon packaging", "Personalized cards included"],
      customization: ["Piece selection", "Palette & theme", "Personalization texts", "Budget guidance"],
      size: "Composed to brief",
      material: "Epoxy resin, mixed pieces",
      colour: "Your chosen palette",
      occasion: "Weddings, corporate, festivals",
      care: "Care card included per piece.",
      tags: "gift hamper, custom gift, corporate gifting",
      featured: false,
      images: [
        { url: IMG("prod-custom-1.jpg"), alt: "Custom resin gift hamper with nameplate, coasters, keychain and frame in matching palette", caption: "One palette, one story" },
      ],
    },
  ];

  const productIdBySlug = new Map<string, string>();
  for (const p of products) {
    const created = await db.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        categoryId: catIdByKey.get(p.catKey)!,
        shortDescription: p.short,
        longDescription: p.long,
        highlights: p.highlights.join("\n"),
        customizationOptions: p.customization.join("\n"),
        size: p.size,
        material: p.material,
        colour: p.colour,
        occasion: p.occasion,
        careInstructions: p.care,
        tags: p.tags,
        featured: p.featured,
        published: true,
        displayOrder: 0,
        focusKeyword: p.name.toLowerCase(),
        metaDescription: `${p.short} Handcrafted by Artistic by Khushi. Enquire on WhatsApp for personalization & pricing.`,
      },
    });
    productIdBySlug.set(p.slug, created.id);
    let order = 0;
    for (const img of p.images) {
      await db.productImage.create({
        data: {
          productId: created.id,
          url: img.url,
          alt: img.alt,
          caption: img.caption,
          isFeatured: order === 0,
          displayOrder: order,
        },
      });
      order += 1;
    }
    if (p.faqs) {
      let faqOrder = 0;
      for (const f of p.faqs) {
        await db.faq.create({
          data: {
            question: f.q,
            answer: f.a,
            entityType: "PRODUCT",
            entityId: created.id,
            displayOrder: faqOrder,
          },
        });
        faqOrder += 1;
      }
    }
  }
  console.log(`✓ ${products.length} products`);

  // Related products (by category adjacency)
  for (const p of products) {
    const catKey = p.catKey;
    const related = products
      .filter((r) => r.catKey === catKey && r.slug !== p.slug)
      .slice(0, 2)
      .map((r) => productIdBySlug.get(r.slug)!);
    if (related.length) {
      await db.product.update({
        where: { id: productIdBySlug.get(p.slug)! },
        data: { relatedProductIds: JSON.stringify(related) },
      });
    }
  }

  // ---------------- Blog categories ----------------
  const blogCats = [
    { name: "Resin Art", slug: "resin-art", order: 1 },
    { name: "Home Décor", slug: "home-decor", order: 2 },
    { name: "Gifting", slug: "gifting", order: 3 },
    { name: "Memory Preservation", slug: "memory-preservation", order: 4 },
    { name: "Product Guides", slug: "product-guides", order: 5 },
    { name: "Resin Care", slug: "resin-care", order: 6 },
  ];
  const blogCatId = new Map<string, string>();
  for (const bc of blogCats) {
    const c = await db.blogCategory.create({
      data: { name: bc.name, slug: bc.slug, displayOrder: bc.order },
    });
    blogCatId.set(bc.slug, c.id);
  }
  console.log("✓ Blog categories");

  // ---------------- Blog posts ----------------
  const posts = [
    {
      title: "10 Resin Nameplate Design Ideas for Indian Homes",
      slug: "resin-nameplate-design-ideas",
      catSlug: "resin-art",
      cover: IMG("blog-nameplate-ideas.jpg"),
      excerpt: "From classic wooden-backed gold lettering to modern minimal blocks — ten nameplate designs that make Indian entrances unforgettable.",
      readingTime: 7,
      tags: "nameplate ideas, resin nameplate, home entrance",
      featured: true,
      content: `<h2>Why your entrance deserves better than a printed nameplate</h2><p>The nameplate is the first thing every guest touches with their eyes. A handcrafted resin nameplate adds depth, light-play and permanence that printed acrylic simply cannot — the letters sit <em>inside</em> the art, not stuck on it.</p><h2>1. The Classic: Espresso & Gold</h2><p>Family name in golden lettering over a deep espresso base, sealed with a crystal-clear top layer. Works with every façade from white to brick.</p><h2>2. Blush Waves for Couples</h2><p>Two names flowing over blush and cream waves with a golden heart — the wedding-gift classic.</p><h2>3. Terracotta & Sage for earthy homes</h2><p>Earthy palettes ground modern minimalist entrances beautifully.</p><h2>4. The Floral Time Capsule</h2><p>Your wedding bouquet's flowers, preserved inside the nameplate itself — a daily hello from your best day.</p><h2>5. Matte Charcoal Executive Block</h2><p>For clinics, offices and study rooms — freestanding, weighty, quietly impressive.</p><h2>6. Mandala Border Nameplates</h2><p>A subtle mandala border frames the text — ideal for traditional interiors.</p><h2>7. Geode Veins</h2><p>Gold veins running like a geode crack through the resin — luxury at first glance.</p><h2>8. Devotional Mantra Plates</h2><p>Om or Ek Onkar above the family name invites positivity right at the door.</p><h2>9. House Number Minimalism</h2><p>Just the number, huge, in gold — unexpectedly striking.</p><h2>10. The Story Plate</h2><p>Family name, city moved from, year of the home — small line of story under the name.</p><h2>Which one is you?</h2><p>All ten (and anything else you dream) are made to order at Artistic by Khushi. <a href="#/contact">Enquire now</a> or <a href="#/category/resin-nameplates">explore our nameplate collection</a>.</p>`,
    },
    {
      title: "How to Care for Resin Art: Keep It Glossy for Years",
      slug: "how-to-care-for-resin-art",
      catSlug: "resin-care",
      cover: IMG("blog-resin-care.jpg"),
      excerpt: "Simple habits that keep your resin nameplates, coasters and jewellery looking freshly-poured for years — no fancy products needed.",
      readingTime: 5,
      tags: "resin care, maintenance, resin art",
      featured: false,
      content: `<h2>Why resin art stays glossy — the science in one line</h2><p>Cured epoxy resin is chemically stable and water-resistant. What ages it is UV exposure, abrasion and heat. Manage those three, and your pieces stay showroom-fresh.</p><h2>Five care rules that matter</h2><ol><li><strong>Soft cloth only.</strong> Microfibre or cotton — never scrubbers.</li><li><strong>Keep out of harsh direct sun.</strong> Our resin is UV-stabilised, but years of intense daily sun can dull any polymer.</li><li><strong>Coasters: wipe, don't soak.</strong> A damp cloth handles rings instantly.</li><li><strong>No hot pans on resin.</strong> Trays are for serving; direct pan-contact heats local spots.</li><li><strong>Jewellery: last on, first off.</strong> Perfume and resin are fine together for seconds, not hours.</li></ol><h2>Quick gloss refresh</h2><p>If a piece ever looks tired after years, a tiny drop of carnauba wax on a soft cloth brings back the mirror finish in thirty seconds.</p><h2>When in doubt</h2><p>Every Artistic by Khushi order ships with a care card — and you can always <a href="#/contact">message us on WhatsApp</a> with a photo; we're happy to advise.</p>`,
    },
    {
      title: "Memory Preservation: How Your Wedding Bouquet Becomes Forever",
      slug: "wedding-bouquet-memory-preservation-guide",
      catSlug: "memory-preservation",
      cover: IMG("blog-memory-guide.jpg"),
      excerpt: "The step-by-step journey from your wedding day flowers to a crystal-clear resin keepsake — drying, design, casting and delivery.",
      readingTime: 6,
      tags: "memory preservation, wedding bouquet, keepsake",
      featured: true,
      content: `<h2>Why preserve flowers at all?</h2><p>Photographs show the bouquet; a preserved piece <em>is</em> the bouquet. Brides tell us holding the actual petals from their wedding day hits differently — a small, heavy, permanent piece of the morning they said yes.</p><h2>The journey, step by step</h2><h3>1. You press (we guide you)</h3><p>Within a day or two of the wedding, flowers are pressed to dry them flat and colour-true. We share a simple guide — no special equipment needed, just patience and a heavy book.</p><h3>2. You courier, we check</h3><p>Dried flowers travel well. On arrival we photograph everything and confirm which blooms cast best.</p><h3>3. Design preview</h3><p>You approve a layout — flower placement, any initials or date in gold, the shape (heart, frame or block).</p><h3>4. Casting & curing</h3><p>Flowers are set in thin layers of museum-grade clear resin over several days — slow pouring protects the petals and prevents bubbles.</p><h3>5. Finishing & delivery</h3><p>Edges are sanded, polished and gold-sealed, then the piece ships double-boxed.</p><h2>How far ahead should you book?</h2><p>3–4 weeks for the full process; in wedding season, 2 months. <a href="#/category/memory-preservation">Explore memory pieces</a> or <a href="#/contact">enquire now</a>.</p>`,
    },
    {
      title: "The Ultimate Handcrafted Gift Guide: Resin Gifts for Every Occasion",
      slug: "handcrafted-resin-gift-guide",
      catSlug: "gifting",
      cover: IMG("blog-gifting-guide.jpg"),
      excerpt: "Housewarmings, weddings, Diwali, first birthdays — a practical gifting guide with budget-friendly picks and 'wow' showpieces.",
      readingTime: 8,
      tags: "gift guide, gifting, resin gifts",
      featured: false,
      content: `<h2>Gift-giving, solved</h2><p>Everyone has a gift drawer of unused platters. A handcrafted, personalized resin piece never lands there — it carries the recipient's <em>own</em> name, home or memory.</p><h2>Housewarming</h2><p><strong>Safe pick:</strong> <a href="#/product/pressed-flower-coaster-set">pressed-flower coaster set</a> with a monogram. <strong>Showpiece:</strong> <a href="#/product/personalized-resin-nameplate">a personalized family nameplate</a> — the gift the whole street admires.</p><h2>Weddings & anniversaries</h2><p><strong>Safe pick:</strong> ivory marble tray. <strong>Emotional showpiece:</strong> the <a href="#/product/wedding-bouquet-memory-heart">wedding bouquet memory heart</a> — guaranteed happy tears.</p><h2>Diwali & festive</h2><p>Coordinated hampers (nameplate + coasters + keychain in one palette) — ask about festive-season batches early.</p><h2>First birthdays</h2><p>The <a href="#/product/first-birthday-memory-frame">first-birthday memory frame</a> preserves day-one shoes and photos — parents keep it forever.</p><h2>Corporate gifting</h2><p>Terrazzo monogram coasters or executive desk nameplates with logo inlay; 10+ pieces get coordinated packaging.</p><h2>Budget quick-map</h2><ul><li>Under ₹500: rose heart keychain</li><li>₹500–1500: monogram coaster sets, dainty studs</li><li>₹1500–3500: trays, statement wall art, memory hearts</li><li>Showpiece: nameplates, memory frames, geode panels</li></ul><p>Want something not listed? <a href="#/category/custom-orders">Custom orders</a> are our happy place.</p>`,
    },
    {
      title: "Behind the Scenes: How a Custom Resin Piece Is Made",
      slug: "custom-resin-art-process",
      catSlug: "product-guides",
      cover: IMG("blog-custom-process.jpg"),
      excerpt: "From your first WhatsApp message to the polished piece at your door — every stage of a custom Artistic by Khushi commission.",
      readingTime: 6,
      tags: "custom order, process, how its made",
      featured: false,
      content: `<h2>Custom orders, demystified</h2><p>People assume custom = complicated. In truth, you do the fun part (the idea) and we do the patient part (the craft). Here's the full journey.</p><h2>Stage 1 — The brief (Day 0)</h2><p>You share the idea on WhatsApp or our <a href="#/contact">inquiry form</a>: what the piece is, who it's for, rough size, palette and date needed. Photos of the space or outfit help enormously.</p><h2>Stage 2 — Design plan (Day 1–2)</h2><p>We reply with a plan: dimensions, palette swatches, materials, timeline and an honest opinion on what will look best. You approve or tweak.</p><h2>Stage 3 — Mockup (Day 3)</h2><p>A layout preview shows text placement, colour flow and motifs. Nothing is poured until you say yes.</p><h2>Stage 4 — Pouring (Day 4–6)</h2><p>Layers are poured slowly — pigments, florals, gold — and left to cure bubble-free.</p><h2>Stage 5 — Curing (Day 7–9)</h2><p>Full hardness takes days; rushing it is how cheap resin cracks.</p><h2>Stage 6 — Finishing (Day 10)</h2><p>Edges sanded through four grits, polished, sealed, hardware fitted, care card packed.</p><h2>Stage 7 — Dispatch</h2><p>Double-boxed, tracked, shipped across India.</p><h2>Ready?</h2><p><a href="#/contact">Send your brief</a> — we take limited custom slots monthly to keep quality high.</p>`,
    },
    {
      title: "Styling Resin Coasters: 6 Coffee-Table Looks",
      slug: "styling-resin-coasters",
      catSlug: "home-decor",
      cover: IMG("blog-coaster-styling.jpg"),
      excerpt: "Tiny pieces, big styling power — six easy coffee-table looks built around handcrafted resin coaster sets.",
      readingTime: 4,
      tags: "home decor, coasters, styling",
      featured: false,
      content: `<h2>The smallest object with the biggest styling leverage</h2><p>Coasters sit exactly at eye-level when someone sits down — the perfect stage for a bit of art. Six looks to steal:</p><h2>1. The Neutral Stack</h2><p>Pressed-flower coasters stacked on a cream runner with a candle — calm, editorial.</p><h2>2. Terracotta Warmth</h2><p>Mandala coasters with a wooden tray and eucalyptus — instant warmth.</p><h2>3. Gold Hour</h2><p>Terrazzo monogram coasters, brass lamp, one amber glass — subtle luxury.</p><h2>4. The Colour Echo</h2><p>Match coaster palette to one accent in your cushions — designers' oldest trick.</p><h2>5. Minimal Grid</h2><p>Square coasters laid in a perfect grid on a bare table — order feels intentional.</p><h2>6. The Gift-Stack Look</h2><p>Tie a set with jute twine on the table — looks styled, works as a gift.</p><h2>Shop the looks</h2><p><a href="#/category/resin-coasters">Explore coaster sets</a> — monograms and gift boxes available.</p>`,
    },
  ];

  for (const post of posts) {
    const publishedAt = new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000);
    await db.blogPost.create({
      data: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.cover,
        coverAlt: post.title,
        author: "Khushi",
        readingTime: post.readingTime,
        tags: post.tags,
        featured: post.featured,
        status: "PUBLISHED",
        publishedAt,
        blogCategoryId: blogCatId.get(post.catSlug)!,
        relatedProductSlugs: "[]",
        focusKeyword: post.title.toLowerCase(),
        metaDescription: post.excerpt,
      },
    });
  }
  console.log(`✓ ${posts.length} blog posts`);

  // ---------------- Pages ----------------
  const pages = [
    {
      title: "About Us",
      slug: "about",
      content: `<h2>Where memories become art</h2><p>Artistic by Khushi is a small-batch resin art studio based in Indore, crafting personalized nameplates, home décor, jewellery and memory keepsakes — each piece poured, cured, sanded and polished by hand.</p><h3>How it started</h3><p>It began at a kitchen table with one silicone mould and a bridal bouquet a friend couldn't bear to throw away. That first preserved-flower heart — cloudy, imperfect, deeply loved — taught us what resin could really hold: not just flowers, but feeling.</p><h3>What we believe</h3><ul><li><strong>Personal beats perfect.</strong> Your names, colours and stories make art meaningful — we design around them.</li><li><strong>Slow is a feature.</strong> Thin-poured layers, patient curing, four-grit polishing. Rushed resin cracks.</li><li><strong>Honest craft.</strong> Real dried flowers, premium UV-stabilised resin, and timelines we actually keep.</li></ul><h3>How we work</h3><p>Every order starts with a conversation — your idea, our design plan, a preview you approve before anything is poured. Nothing here is mass-produced, and that's exactly the point.</p><h3>Let's make something together</h3><p>Browse the <a href="#/categories">collections</a>, read the <a href="#/blog">journal</a>, or <a href="#/contact">say hello</a> — we reply personally.</p>`,
      metaDescription: "The story of Artistic by Khushi — a small-batch handcrafted resin art studio from Indore making personalized décor, gifts and memory keepsakes.",
      order: 1,
    },
    {
      title: "Services",
      slug: "services",
      content: `<h2>What we do</h2><p>Artistic by Khushi is a full-service resin art studio. Beyond our ready collections, we offer:</p><h3>Custom commissions</h3><p>Your idea, size, palette and theme — designed with you, handcrafted to brief. From single gifts to full coordinated sets.</p><h3>Memory preservation</h3><p>Wedding bouquets, anniversary roses and baby keepsakes encased in museum-grade clear resin, guided carefully through drying, design and casting.</p><h3>Bulk & corporate gifting</h3><p>Coordinated hampers, logo-inlaid desk pieces and monogram sets for events, weddings and corporate gifting — with special bulk pricing at 10+ pieces.</p><h3>Wedding & festive collections</h3><p>Return gifts, couple nameplates and coordinated table pieces made to your palette, booked ahead for your date.</p><h3>Interior styling pieces</h3><p>Statement wall art, Lippan panels and trays designed around your actual room — share a photo of the wall and we'll match the piece to it.</p><p><a href="#/contact">Start a conversation</a> about your project today.</p>`,
      metaDescription: "Custom resin commissions, memory preservation, corporate gifting and interior styling pieces by Artistic by Khushi.",
      order: 2,
    },
    {
      title: "Privacy Policy",
      slug: "privacy-policy",
      content: `<h2>Privacy Policy</h2><p>Last updated: 2025. This policy explains how Artistic by Khushi ("we", "us") handles information when you use our website.</p><h3>What we collect</h3><p>When you submit an inquiry we collect your <strong>name, mobile number, city and optional message</strong> — only what you type into the form. We also record the page you enquired from and basic referral information.</p><h3>How we use it</h3><ul><li>To respond to your inquiry on phone, WhatsApp or email</li><li>To maintain our lead records (stored in our database and a private Google Sheet)</li></ul><h3>What we never do</h3><ul><li>Sell or rent your information to anyone</li><li>Send unrelated marketing spam</li></ul><h3>Cookies & analytics</h3><p>We may use standard, privacy-respecting analytics to count page views. No personal identity tracking.</p><h3>Your choices</h3><p>Ask us anytime to update or delete your inquiry data via <a href="#/contact">our contact page</a>.</p>`,
      metaDescription: "How Artistic by Khushi collects, uses and protects your inquiry information.",
      order: 10,
    },
    {
      title: "Terms & Conditions",
      slug: "terms-conditions",
      content: `<h2>Terms & Conditions</h2><p>Last updated: 2025. By using this website and enquiring about our products you agree to these terms.</p><h3>Custom-made products</h3><p>All pieces are handcrafted to order. Design previews are approved before casting; after casting begins, design changes may not be possible.</p><h3>Payments & pricing</h3><p>Quoted prices are confirmed at order time. Custom orders typically require an advance before work begins.</p><h3>Shipping</h3><p>We ship across India with careful double-boxed packaging. Timelines are shared per order and depend on curing time.</p><h3>Returns</h3><p>Because each piece is personalized, returns aren't available for custom work. If a piece arrives damaged, contact us within 48 hours with photos — we repair or remake.</p><h3>Handmade character</h3><p>Tiny bubbles, micro-variations in floral placement and marble flow are the signature of handmade art, not defects.</p>`,
      metaDescription: "Terms of service for orders and custom commissions with Artistic by Khushi.",
      order: 11,
    },
    {
      title: "Disclaimer",
      slug: "disclaimer",
      content: `<h2>Disclaimer</h2><p>Last updated: 2025.</p><h3>Handcrafted variance</h3><p>Artistic by Khushi products are handmade. Product photographs are representative — each finished piece varies naturally in floral placement, marble flow and tone.</p><h3>Care responsibility</h3><p>Resin is durable but not indestructible. Follow the care card provided with each order; damage from heat, dropping or harsh chemicals is not covered.</p><h3>Preserved florals</h3><p>Flowers are natural materials and subtle tonal shifts over years are normal for organic inlays.</p><h3>Third-party links</h3><p>We are not responsible for content on external sites linked from our pages.</p>`,
      metaDescription: "Product, care and materials disclaimer for handcrafted resin art by Artistic by Khushi.",
      order: 12,
    },
  ];
  for (const pg of pages) {
    await db.page.create({
      data: {
        title: pg.title,
        slug: pg.slug,
        content: pg.content,
        published: true,
        displayOrder: pg.order,
        metaDescription: pg.metaDescription,
      },
    });
  }
  console.log(`✓ ${pages.length} pages`);

  // ---------------- General FAQs ----------------
  const generalFaqs = [
    {
      q: "Do you take custom orders?",
      a: "Yes — custom is our happy place! Share your idea (size, colours, theme, text) via the inquiry form or WhatsApp and we'll send a design plan and quote.",
    },
    {
      q: "How long does an order take?",
      a: "Most pieces ship in 7–10 days after design approval. Memory preservation pieces take 3–4 weeks (drying + curing). Festive-season bulk orders: book 2 months ahead.",
    },
    {
      q: "Do you ship across India?",
      a: "Yes, we ship pan-India with careful double-boxed packaging. Shipping cost and timeline are confirmed at order time.",
    },
    {
      q: "How do I place an order?",
      a: "There's no cart — just enquire! Fill the inquiry form on any product page or message us on WhatsApp. We confirm the design, quote and timeline personally.",
    },
    {
      q: "How do I pay?",
      a: "After design approval, we share payment details (UPI / bank transfer). Custom orders need a small advance; balance before dispatch.",
    },
    {
      q: "Can I get my wedding bouquet preserved?",
      a: "Absolutely — it's our most-loved service. We guide you through pressing and couriering the flowers, then design the keepsake with you.",
    },
    {
      q: "Are the flowers real?",
      a: "Yes — real dried flowers, preserved and sealed in premium resin. No fakes, ever.",
    },
    {
      q: "Will the resin turn yellow?",
      a: "We use UV-stabilised, non-yellowing resin. Kept out of harsh direct sunlight, your piece stays crystal-clear for years.",
    },
  ];
  let faqOrder = 0;
  for (const f of generalFaqs) {
    await db.faq.create({
      data: { question: f.q, answer: f.a, entityType: "GENERAL", displayOrder: faqOrder },
    });
    faqOrder += 1;
  }
  console.log(`✓ ${generalFaqs.length} FAQs`);

  // ---------------- Media library registration ----------------
  const allImages = new Set<string>([
    "hero-main.jpg", "about-studio.jpg", "cta-bg.jpg", "og-default.jpg",
    ...categories.map((c) => c.image.split("/").pop()!),
    ...products.flatMap((p) => p.images.map((i) => i.url.split("/").pop()!)),
    ...posts.map((p) => p.cover.split("/").pop()!),
  ]);
  for (const file of allImages) {
    await db.mediaAsset.create({
      data: {
        url: IMG(file),
        filename: file,
        alt: file.replace(/[-.]/g, " ").replace(/ jpg| png/g, ""),
        title: file,
      },
    });
  }
  console.log(`✓ ${allImages.size} media assets`);

  console.log("\n🌱 Seed complete! Login: admin@artisticbykhushi.com / Khushi@2024");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

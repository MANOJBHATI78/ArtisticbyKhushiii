#!/bin/bash
# Artistic by Khushi — brand image generation (warm cream/gold/terracotta palette, no blue)
set -u
DIR=/home/z/my-project/public/images
mkdir -p "$DIR"
LOG=/home/z/my-project/imagegen.log
: > "$LOG"

gen() {
  local file="$1"; local size="$2"; local prompt="$3"
  if [ -s "$DIR/$file" ]; then echo "SKIP $file" >> "$LOG"; return 0; fi
  z-ai image -p "$prompt" -o "$DIR/$file" -s "$size" >> "$LOG" 2>&1
  echo "DONE $file" >> "$LOG"
}

# ---------- Hero & brand ----------
gen hero-main.jpg 1440x720 "Luxurious flat lay of handcrafted epoxy resin art pieces on warm cream linen: personalized nameplate with gold lettering, hexagonal coasters with pressed dried flowers, gold-rimmed serving tray, soft natural window light, terracotta and gold accents, premium artisan brand photography, elegant, high quality, detailed"
gen about-studio.jpg 1024x1024 "Cozy artisan home studio workspace for resin art: wooden table with epoxy resin mixing cups, dried flowers, gold pigment bottles, dried bouquet, warm afternoon sunlight, terracotta walls, handmade craft atmosphere, warm and inviting, high quality photography"
gen cta-bg.jpg 1440x720 "Abstract epoxy resin pour art background, swirling gold and champagne and terracotta pigments on cream, marble-like glossy texture, elegant premium texture, high detail, macro photography"
gen og-default.jpg 1344x768 "Elegant collection of handcrafted resin art gifts: nameplate, coasters, keychain and photo frame arranged on cream background with gold ribbon and dried flowers, premium Indian handcrafted brand photography, warm tones, high quality"

# ---------- Category images ----------
gen cat-nameplates.jpg 1024x1024 "Handcrafted personalized resin house nameplate with golden family name lettering and preserved dried flowers embedded in clear glossy epoxy resin, wooden backing, warm cream wall background, premium product photography, high quality, detailed"
gen cat-mantra-frames.jpg 1024x1024 "Spiritual resin wall frame with golden Om symbol and mandala pattern, warm amber epoxy resin with gold flakes, elegant Indian devotional decor, cream background, premium product photography, high quality"
gen cat-lippan-art.jpg 1024x1024 "Traditional Indian Lippan mud mirror art wall panel, white clay relief patterns with circular mirrors, terracotta and cream tones, handcrafted Gujarati tribal wall decor, premium photography, high detail"
gen cat-wall-art.jpg 1024x1024 "Abstract fluid epoxy resin wall art, swirling champagne gold and terracotta and blush pigments on white canvas, glossy finish, modern luxury home decor artwork, premium photography, high quality"
gen cat-trays.jpg 1024x1024 "Handcrafted round epoxy resin serving tray with gold rim handle, terracotta and cream marble effect with gold flakes, styled with teacups on wooden table, premium product photography, high quality"
gen cat-coasters.jpg 1024x1024 "Set of hexagonal handcrafted resin coasters with real pressed dried flowers and gold edges, arranged elegantly on cream linen, glossy epoxy surface, premium product photography, high quality, detailed"
gen cat-keychains.jpg 1024x1024 "Collection of personalized epoxy resin keychains with golden initial letters, dried flowers and glitter, gold key rings, arranged on warm cream background, premium product photography, high quality"
gen cat-jewellery.jpg 1024x1024 "Handcrafted resin jewellery: statement earrings and pendant necklace with pressed flowers and gold leaf embedded in glossy clear resin, displayed on cream silk fabric, premium jewellery photography, high quality"
gen cat-memory.jpg 1024x1024 "Sentimental memory preservation resin frame: wedding bouquet dried flowers preserved in clear glossy epoxy resin in elegant wooden frame, cream background with soft candle light, premium keepsake photography, high quality"
gen cat-custom.jpg 1024x1024 "Female artisan hands in gloves pouring golden epoxy resin into heart shaped mold, craft studio, dried flowers and pigment pots nearby, warm lighting, premium handcraft photography, high quality"

# ---------- Product images ----------
gen prod-nameplate-1.jpg 1024x1024 "Personalized family nameplate Sharma Residence in golden letters on deep espresso brown glossy resin with preserved dried flowers and gold flakes, luxury home entrance decor, premium product photography"
gen prod-nameplate-2.jpg 1024x1024 "Couple name nameplate with two golden names and heart accent, blush pink and cream epoxy resin waves, gold flakes, wooden backing, romantic wedding gift, premium product photography"
gen prod-nameplate-office.jpg 1024x1024 "Minimal office nameplate with brass style letters on matte charcoal and gold resin block, executive desk decor, premium product photography"
gen prod-mantra-1.jpg 1024x1024 "Gayatri Mantra calligraphy in gold on ivory epoxy resin frame with subtle mandala border, spiritual wall decor, premium product photography, high detail"
gen prod-mantra-2.jpg 1024x1024 "Ek Onkar symbol in golden resin with cream and amber marbled background, Sikh spiritual gift frame, premium product photography"
gen prod-lippan-1.jpg 1024x1024 "Large Lippan mud mirror art wall hanging with peacock motif in white clay and mirrors, terracotta border, Indian traditional handcraft, premium photography"
gen prod-wall-art-1.jpg 1152x864 "Large abstract resin wall art panel with champagne gold and terracotta wave patterns, glossy epoxy on white, luxury living room wall decor, premium photography"
gen prod-wall-art-2.jpg 1152x864 "Geode style epoxy resin wall art with crystal points and gold veins, cream and caramel tones, luxury crystal artwork, premium photography"
gen prod-tray-1.jpg 1024x1024 "Oval epoxy resin serving tray, ivory and gold marble swirls with brass handles, styled with ceramic teapot and cups, premium hospitality product photography"
gen prod-tray-2.jpg 1024x1024 "Round resin lazy susan tray with terracotta mandala pattern and gold rim, dining table styling, premium product photography"
gen prod-coaster-1.jpg 1024x1024 "Six piece hexagonal resin coaster set with assorted dried flowers and gold edges, stacked and fanned on cream table, premium product photography"
gen prod-coaster-2.jpg 1024x1024 "Square resin coasters with white and gold terrazzo pattern, monogram letter in gold, elegant gift box packaging, premium product photography"
gen prod-keychain-1.jpg 1024x1024 "Heart shaped resin keychain with pressed red rose petals and gold glitter border, initial charm, romantic gift, premium macro photography"
gen prod-keychain-2.jpg 1024x1024 "Couple matching resin keychains with two halves of one heart, names engraved in gold, anniversary gift, premium macro photography"
gen prod-earrings-1.jpg 1024x1024 "Statement resin drop earrings with terracotta and gold ink swirls and gold hooks, displayed on cream stand, luxury jewellery photography"
gen prod-earrings-2.jpg 1024x1024 "Dainty resin stud earrings with tiny pressed flowers and gold leaf, minimalist handmade jewellery on cream silk, macro photography"
gen prod-pendant-1.jpg 1024x1024 "Resin pendant necklace with gold leaf flakes and baby breath dried flowers in teardrop shape, gold chain, luxury handmade jewellery photography"
gen prod-bracelet-1.jpg 1024x1024 "Bangle bracelet made of glossy ivory resin with gold veins and dried flower inlay, Indian festive jewellery, premium photography"
gen prod-memory-1.jpg 1024x1024 "Wedding bouquet preservation: pink and cream dried roses and baby breath flowers in clear resin heart shaped keepsake, gold edge, sentimental gift photography"
gen prod-memory-2.jpg 864x1152 "First birthday memory box frame: tiny shoes, hospital cap and photos preserved in epoxy resin display frame, cream and gold, sentimental keepsake photography"
gen prod-memory-3.jpg 1024x1024 "Anniversary gift: preserved proposal roses in clear resin photo frame with couple initials in gold, romantic keepsake photography"
gen prod-custom-1.jpg 1024x1024 "Custom made resin gift hamper: nameplate, coasters, keychain and frame in matching terracotta gold theme, premium gift box with ribbon, high quality photography"

# ---------- Blog covers ----------
gen blog-nameplate-ideas.jpg 1344x768 "Collage inspiration board of Indian home entrance doors decorated with personalized resin nameplates in different colors, warm aesthetic, editorial magazine style, high quality"
gen blog-resin-care.jpg 1344x768 "Person polishing a glossy resin coaster with soft cloth, care products nearby, warm home setting, editorial how-to photography, high quality"
gen blog-memory-guide.jpg 1344x768 "Hands gently placing dried wedding bouquet flowers into epoxy resin mold, memory preservation craft process, warm lighting, editorial photography"
gen blog-gifting-guide.jpg 1344x768 "Elegant flat lay of handmade resin gift collection with kraft paper, jute twine and dried flowers, festive Diwali gifting mood, editorial photography"
gen blog-custom-process.jpg 1344x768 "Artisan sketching custom design then pouring pigmented resin into mold, craft studio process, warm tones, editorial step by step photography"
gen blog-coaster-styling.jpg 1344x768 "Coffee table styled with resin coasters, ceramic mugs, eucalyptus and linen napkin, cozy home decor inspiration, editorial photography"

echo "ALL_DONE" >> "$LOG"

import { getSettings } from "@/lib/server-utils";

export const dynamic = "force-dynamic";

/**
 * Google Business Profile reviews via the Places API (New).
 *
 * The owner configures googlePlacesApiKey + googlePlaceId in
 * Admin → Site Settings → Google Reviews. Until both are set this
 * endpoint returns configured:false and the site simply hides the section.
 *
 * Responses are cached in-process for 6 hours to stay far below quota.
 */

interface GoogleReview {
  name?: string;
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  relativePublishTimeDescription?: string;
  authorAttribution?: { displayName?: string; photoUri?: string; uri?: string };
  publishTime?: string;
}

interface PlacesResponse {
  rating?: number;
  userRatingCount?: number;
  reviews?: GoogleReview[];
  googleMapsUri?: string;
}

interface NormalizedReview {
  author: string;
  rating: number;
  text: string;
  when: string;
  photo: string;
  profileUrl: string;
  publishedAt: string;
}

interface Payload {
  ok: true;
  configured: true;
  rating: number;
  total: number;
  mapsUrl: string;
  writeReviewUrl: string;
  reviews: NormalizedReview[];
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map<string, { at: number; payload: Payload | null }>();

export async function GET() {
  try {
    const settings = await getSettings();
    const key = (settings.googlePlacesApiKey || "").trim();
    const placeId = (settings.googlePlaceId || "").trim();

    if (!key || !placeId) {
      return Response.json({ ok: true, configured: false });
    }

    const cached = cache.get(placeId);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      if (!cached.payload) return Response.json({ ok: true, configured: false, error: "upstream" });
      return Response.json(cached.payload, { headers: { "Cache-Control": "public, max-age=3600" } });
    }

    // Places API (New) — fields limited to what we display.
    const url =
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}` +
      `?fields=rating,userRatingCount,reviews,googleMapsUri&key=${encodeURIComponent(key)}`;

    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) {
      // Bad key / quota / invalid place id — degrade gracefully, never break the site.
      console.error("[api/public/google-reviews] upstream", res.status, (await res.text()).slice(0, 300));
      cache.set(placeId, { at: Date.now(), payload: null });
      return Response.json({ ok: true, configured: false });
    }

    const data = (await res.json()) as PlacesResponse;
    const reviews: NormalizedReview[] = (data.reviews || [])
      .map((r) => ({
        author: r.authorAttribution?.displayName || "Google user",
        rating: typeof r.rating === "number" ? r.rating : 5,
        text: (r.text?.text || r.originalText?.text || "").trim(),
        when: r.relativePublishTimeDescription || "",
        photo: r.authorAttribution?.photoUri || "",
        profileUrl: r.authorAttribution?.uri || "",
        publishedAt: r.publishTime || "",
      }))
      .filter((r) => r.text.length > 0)
      .slice(0, 9);

    const payload: Payload = {
      ok: true,
      configured: true,
      rating: typeof data.rating === "number" ? data.rating : 5,
      total: typeof data.userRatingCount === "number" ? data.userRatingCount : reviews.length,
      mapsUrl: data.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
      writeReviewUrl: `https://search.google.com/local/writereview?placeid=${placeId}`,
      reviews,
    };

    cache.set(placeId, { at: Date.now(), payload });
    return Response.json(payload, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (e) {
    console.error("[api/public/google-reviews]", e);
    return Response.json({ ok: true, configured: false });
  }
}

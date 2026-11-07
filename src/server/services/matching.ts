export type MatchUrgency = 'LOW' | 'MEDIUM' | 'HIGH';
export interface MatchCandidate { distanceKm: number; radiusKm: number; ratingAvg: number; ratingCount: number; minPrice: number; jobsDone: number; availabilityScore: number; availabilityReason: string }
export interface MatchContext { priceMin: number; priceMax: number; averagePrice: number; urgency?: MatchUrgency }
export interface MatchBreakdown { distance: number; rating: number; availability: number; price: number; experience: number }
export interface MatchResult { score: number; breakdown: MatchBreakdown; reasons: string[] }
const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Pure, deterministic provider ranking. The returned score is a whole-number percentage. */
export function calculateMatchScore(candidate: MatchCandidate, context: MatchContext): MatchResult {
  const distance = clamp(1 - candidate.distanceKm / Math.max(candidate.radiusKm, 0.1));
  const rating = clamp(((candidate.ratingAvg * candidate.ratingCount) + (4 * 3)) / (candidate.ratingCount + 3) / 5);
  const availability = clamp(candidate.availabilityScore);
  const price = context.priceMax === context.priceMin ? 1 : clamp(1 - (candidate.minPrice - context.priceMin) / (context.priceMax - context.priceMin));
  const experience = clamp(candidate.jobsDone / 100);
  const weights = context.urgency === 'HIGH' ? { distance: .45, availability: .35, rating: .15, price: .05, experience: 0 } : { distance: .30, rating: .25, availability: .20, price: .15, experience: .10 };
  const score = Math.round((distance * weights.distance + rating * weights.rating + availability * weights.availability + price * weights.price + experience * weights.experience) * 100);
  const priceReason = candidate.minPrice < context.averagePrice ? 'Below average price' : candidate.minPrice > context.averagePrice ? 'Above average price' : 'Average price';
  return { score, breakdown: { distance, rating, availability, price, experience }, reasons: [`${candidate.distanceKm.toFixed(1)} km away`, `${candidate.ratingAvg.toFixed(1)}★ from ${candidate.ratingCount} reviews`, candidate.availabilityReason, priceReason, `${candidate.jobsDone} jobs done`] };
}

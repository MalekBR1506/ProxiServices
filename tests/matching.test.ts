import { describe, expect, it } from 'vitest';
import { calculateMatchScore } from '@/server/services/matching';

const candidate = { distanceKm: 2.1, radiusKm: 20, ratingAvg: 4.8, ratingCount: 37, minPrice: 45, jobsDone: 86, availabilityScore: 1, availabilityReason: 'Free tomorrow' };

describe('provider matching', () => {
  it('returns the weighted score and plain-language reasons', () => {
    const result = calculateMatchScore(candidate, { priceMin: 40, priceMax: 80, averagePrice: 60 });
    expect(result.score).toBeGreaterThan(70);
    expect(result.reasons).toEqual(expect.arrayContaining(['2.1 km away', '4.8★ from 37 reviews', 'Free tomorrow', 'Below average price', '86 jobs done']));
  });

  it('prioritizes distance and availability for urgent jobs', () => {
    const normal = calculateMatchScore({ ...candidate, distanceKm: 15, availabilityScore: 0 }, { priceMin: 40, priceMax: 80, averagePrice: 60 });
    const urgent = calculateMatchScore({ ...candidate, distanceKm: 15, availabilityScore: 0 }, { priceMin: 40, priceMax: 80, averagePrice: 60, urgency: 'HIGH' });
    expect(urgent.score).toBeLessThan(normal.score);
    expect(urgent.breakdown.experience).toBe(0.86);
  });
});

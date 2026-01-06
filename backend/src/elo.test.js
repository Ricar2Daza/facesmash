import { updateElo, expectedScore } from './elo.js';

describe('ELO System', () => {
  test('expectedScore should return correct probability', () => {
    // Equal rating = 0.5
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5);
    // Higher rating should have higher probability
    expect(expectedScore(1500, 1200)).toBeGreaterThan(0.5);
    expect(expectedScore(1200, 1500)).toBeLessThan(0.5);
  });

  test('updateElo should increase winner rating and decrease loser rating', () => {
    const rA = 1200;
    const rB = 1200;
    // A wins (result = 1)
    const { newRatingA, newRatingB } = updateElo(rA, rB, 1);
    
    expect(newRatingA).toBeGreaterThan(rA);
    expect(newRatingB).toBeLessThan(rB);
  });

  test('updateElo should handle draws', () => {
    const rA = 1200;
    const rB = 1200;
    // Draw (result = 0.5)
    const { newRatingA, newRatingB } = updateElo(rA, rB, 0.5);
    
    // Equal ratings draw -> no change
    expect(newRatingA).toBe(1200);
    expect(newRatingB).toBe(1200);
  });

  test('updateElo should respect min/max boundaries', () => {
    const { newRatingA } = updateElo(800, 2000, 0); // Loser at min
    expect(newRatingA).toBeGreaterThanOrEqual(800);

    const { newRatingB } = updateElo(2400, 1200, 0); // Winner at max (B wins -> resultA=0 implies B=1)
    // Wait, updateElo(ratingA, ratingB, actualScoreA). If A loses (0), B wins.
    // updateElo returns { newRatingA, newRatingB }
    
    // Let's test boundary explicitly if implementation has it
    // Implementation: Math.max(800, Math.min(2400, ...))
    const res = updateElo(2399, 1200, 1);
    expect(res.newRatingA).toBeLessThanOrEqual(2400);
  });
});

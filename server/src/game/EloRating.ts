const K = 32;

export function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number // 1 = win, 0.5 = draw, 0 = loss
): { newRatingA: number; newRatingB: number; deltaA: number; deltaB: number } {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;

  const deltaA = Math.round(K * (scoreA - expectedA));
  const deltaB = Math.round(K * (1 - scoreA - expectedB));

  return {
    newRatingA: Math.max(100, ratingA + deltaA),
    newRatingB: Math.max(100, ratingB + deltaB),
    deltaA,
    deltaB,
  };
}

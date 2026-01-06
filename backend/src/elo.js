export function expectedScore(rating, opponentRating) {
  const exponent = (opponentRating - rating) / 400;
  return 1 / (1 + Math.pow(10, exponent));
}

function kFactor(rating) {
  if (rating < 1800) return 32;
  if (rating < 2100) return 24;
  return 16;
}

export function updateElo(ratingA, ratingB, result) {
  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = expectedScore(ratingB, ratingA);
  const kA = kFactor(ratingA);
  const kB = kFactor(ratingB);

  // Result puede ser "A", "B", "T" (string) O 1, 0, 0.5 (number)
  // Estandarizamos a number
  let scoreA;
  if (typeof result === 'string') {
     if (result === 'A') scoreA = 1;
     else if (result === 'B') scoreA = 0;
     else scoreA = 0.5;
  } else {
     scoreA = result; // Assume 1, 0, 0.5
  }
  const scoreB = 1 - scoreA;

  let newRatingA = ratingA + kA * (scoreA - expectedA);
  let newRatingB = ratingB + kB * (scoreB - expectedB);

  const minRating = 800;
  const maxRating = 2400;

  if (newRatingA < minRating) newRatingA = minRating;
  if (newRatingA > maxRating) newRatingA = maxRating;
  if (newRatingB < minRating) newRatingB = minRating;
  if (newRatingB > maxRating) newRatingB = maxRating;

  return { newRatingA, newRatingB };
}



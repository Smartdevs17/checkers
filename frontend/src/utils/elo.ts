import { getRatingTier } from "./constants";

export function formatRating(rating: number): string {
  return rating.toString();
}

export function formatRatingDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return delta.toString();
}

export { getRatingTier };

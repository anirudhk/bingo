/**
 * Kid-friendly description of how far off a wrong answer was. Avoids signed
 * numbers ("Off by -4"), which younger players don't read as "too small".
 */
export const describeMiss = (result: number, target: number): string => {
  const diff = target - result;
  if (diff > 0) return `You need ${diff} more to make ${target}.`;
  return `That's ${-diff} too many — the target is ${target}.`;
};

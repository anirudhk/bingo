/**
 * One plain-language line under the target. The left-to-right rule only
 * matters once × can follow + or − in a 3-number path, so it isn't
 * mentioned before then (Unit 4 on the Learn path).
 */
export const rhythmInstruction = (
  pathTiles: number,
  operators: readonly string[],
  signsPerGap?: number
): string => {
  if (pathTiles <= 2 && signsPerGap === 1) {
    return 'Tap a number, the sign next to it, then the number on the other side.';
  }
  if (pathTiles <= 2)
    return 'Tap a number, pick one of the signs next to it, then the number on the other side.';
  const words: Record<number, string> = { 3: 'three', 4: 'four', 5: 'five' };
  const n = words[pathTiles] ?? String(pathTiles);
  const rhythm = Array.from({ length: pathTiles }, () => 'number').join(', sign, ');
  const line = `Use ${n} numbers in one row or column: tap ${rhythm}.`;
  return operators.includes('*') ? `${line} Work left to right: (2 + 3) × 4 = 20.` : line;
};

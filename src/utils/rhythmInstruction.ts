/**
 * One plain-language line under the target. The left-to-right rule only
 * matters once × can follow + or − in a 3-number path, so it isn't
 * mentioned before then (Unit 4 on the Learn path).
 */
export const rhythmInstruction = (pathTiles: number, operators: readonly string[]): string => {
  if (pathTiles <= 2) return 'Tap a number, a sign, then a number next to it.';
  const line = `Tap ${pathTiles} numbers in a straight line, with a sign between each.`;
  return operators.includes('*') ? `${line} Work left to right: (2 + 3) × 4 = 20.` : line;
};

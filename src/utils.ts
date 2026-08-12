// src/utils.ts

export function getTileImagePath(
  tile: string | null | undefined
): string {
  if (!tile) return "";
  const lower = tile.toLowerCase();

  // --- Castles ---
  if (lower.includes("castle")) {
    const color = lower.match(/^(red|blue|green|yellow)/)?.[0];
    const rankMatch = tile.match(/R(\d)/i);
    const rank = rankMatch?.[1];
    if (!color || !rank) return "";
  
    const style = 'castles';
    
    // Construct path with the determined style folder
    return `/images/${style}/${color}${rank}.png`;
  }

  // --- Special tiles ---
  if (lower.startsWith("dragon")) return "/images/tiles/dragon.webp";
  if (lower.startsWith("wizard")) return "/images/tiles/wizard.webp";
  if (lower.startsWith("mounta")) return "/images/tiles/mounta.webp";
  if (lower.startsWith("mountb")) return "/images/tiles/mountb.webp";
  if (lower.startsWith("goldmine")) return "/images/tiles/goldmine.webp";

  // --- Minus tiles ---
  if (lower.startsWith("minus")) {
    const value = lower.match(/\d+/)?.[0];
    if (!value) return "";
    return `/images/tiles/minus${value}.webp`;
  }

  // --- Plus tiles (a/b variant) ---
  if (lower.startsWith("plus")) {
    const value = lower.match(/\d+/)?.[0];
    if (!value) return "";
    // Use suffix if explicitly part of the string, default to "a"
    const suffix = lower.endsWith("b") ? "b" : "a";
    return `/images/tiles/plus${value}${suffix}.webp`;
  }

  return "";
}

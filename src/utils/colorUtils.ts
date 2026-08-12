// src/utils/colorUtils.ts
import type { PlayerColor } from '../types';

export const colorMap: Record<PlayerColor, string> = {
  red: '#ff0800',
  blue: '#394dfe', // Your new blue hex code is now the single source of truth
  green: '#01ff00',
  yellow: '#ffe107',
};

// You can also define the lighter text version here for consistency
export const lightColorMap: Record<PlayerColor, string> = {
  red: '#ff8a80',
  blue: '#3ab2fc', // A lighter version of your new blue
  green: '#b9f6ca',
  yellow: '#ffe107',
};

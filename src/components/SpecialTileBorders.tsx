// src/components/SpecialTileBorders.tsx
import { useMemo, useEffect } from 'react';
import type { GameState, CellCoord } from '../types';

interface SpecialTileBordersProps {
  gameState: GameState;
  onAffectedCellsChange: (cells: CellCoord[]) => void;
}

export function SpecialTileBorders({ gameState, onAffectedCellsChange }: SpecialTileBordersProps) {
  const { board } = gameState;
  const rows = board.length;
  const cols = board[0]?.length || 0;

  const positions = useMemo(() => {
    const dragon: CellCoord[] = [];
    const goldmine: CellCoord[] = [];
    const wizard: CellCoord[] = [];
    const mountains: CellCoord[] = [];

    board.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (!cell) return;
        const lower = cell.toLowerCase();
        if (lower.startsWith('dragon')) dragon.push({ r, c });
        if (lower.startsWith('goldmine')) goldmine.push({ r, c });
        if (lower.startsWith('wizard')) wizard.push({ r, c });
        if (lower.includes('mount')) mountains.push({ r, c });
      });
    });
    return { dragon, goldmine, wizard, mountains };
  }, [board]);

  // This useEffect hook calculates which cells are affected by borders and
  // reports them to the parent GameBoard component.
  useEffect(() => {
    const affected = new Set<string>(); // Use a Set of "r,c" strings to avoid duplicates

    const addAffectedInRange = (r1: number, c1: number, r2: number, c2: number) => {
      for (let r = r1; r < r2; r++) {
        for (let c = c1; c < c2; c++) {
          affected.add(`${r},${c}`);
        }
      }
    };

    const getMountainsInRow = (r: number) => positions.mountains.filter((m) => m.r === r).sort((a, b) => a.c - b.c);
    const getMountainsInCol = (c: number) => positions.mountains.filter((m) => m.c === c).sort((a, b) => a.r - b.r);

    const handleSpecial = (specials: CellCoord[]) => {
      specials.forEach(({ r, c }) => {
        // Horizontal span
        const rowMounts = getMountainsInRow(r);
        const leftMountain = rowMounts.filter(m => m.c < c).pop();
        const rightMountain = rowMounts.find(m => m.c > c);
        const hStartCol = leftMountain ? leftMountain.c + 1 : 0;
        const hEndCol = rightMountain ? rightMountain.c : cols;
        if (hStartCol < hEndCol) {
          addAffectedInRange(r, hStartCol, r + 1, hEndCol);
        }
        
        // Vertical span
        const colMounts = getMountainsInCol(c);
        const topMountain = colMounts.filter(m => m.r < r).pop();
        const bottomMountain = colMounts.find(m => m.r > r);
        const vStartRow = topMountain ? topMountain.r + 1 : 0;
        const vEndRow = bottomMountain ? bottomMountain.r : rows;
        if(vStartRow < vEndRow) {
          addAffectedInRange(vStartRow, c, vEndRow, c + 1);
        }
      });
    };

    handleSpecial(positions.dragon);
    handleSpecial(positions.goldmine);

    positions.wizard.forEach(({ r, c }) => {
      // Horizontal 3-cell span
      addAffectedInRange(r, Math.max(0, c - 1), r + 1, Math.min(cols, c + 2));
      // Vertical 3-cell span
      addAffectedInRange(Math.max(0, r - 1), c, Math.min(rows, r + 2), c + 1);
    });

    const affectedCoords = Array.from(affected).map(s => {
      const [r, c] = s.split(',').map(Number);
      return { r, c };
    });
    
    // Call the callback prop to notify the parent component
    onAffectedCellsChange(affectedCoords);

  }, [positions, rows, cols, onAffectedCellsChange]);


  // This useMemo hook calculates the JSX for the borders themselves, now using
  // CSS Grid for perfect alignment.
  const borders = useMemo(() => {
    const borderElements: JSX.Element[] = [];

    const addSpan = (key: string, className: string, rowStart: number, colStart: number, rowEnd: number, colEnd: number) => {
      const gridStyle = {
        gridRow: `${rowStart + 1} / ${rowEnd}`,
        gridColumn: `${colStart + 1} / ${colEnd}`,
      };
      borderElements.push(<div key={key} className={`animated-border-wrapper ${className}`} style={gridStyle} />);
    };

    const getMountainsInRow = (r: number) => positions.mountains.filter((m) => m.r === r).sort((a, b) => a.c - b.c);
    const getMountainsInCol = (c: number) => positions.mountains.filter((m) => m.c === c).sort((a, b) => a.r - b.r);

    const handleSpecial = (specials: CellCoord[], type: 'dragon' | 'goldmine') => {
      specials.forEach(({ r, c }, index) => {
        // Horizontal span
        const rowMounts = getMountainsInRow(r);
        const leftMountain = rowMounts.filter(m => m.c < c).pop();
        const rightMountain = rowMounts.find(m => m.c > c);
        const hStartCol = leftMountain ? leftMountain.c + 1 : 0;
        const hEndCol = rightMountain ? rightMountain.c + 1 : cols + 1;
        if (hStartCol < hEndCol -1) {
            addSpan(`${type}-h-${index}`, `${type}-border-h`, r, hStartCol, r + 2, hEndCol);
        }
        
        // Vertical span
        const colMounts = getMountainsInCol(c);
        const topMountain = colMounts.filter(m => m.r < r).pop();
        const bottomMountain = colMounts.find(m => m.r > r);
        const vStartRow = topMountain ? topMountain.r + 1 : 0;
        const vEndRow = bottomMountain ? bottomMountain.r + 1 : rows + 1;
        if(vStartRow < vEndRow -1) {
          addSpan(`${type}-v-${index}`, `${type}-border-v`, vStartRow, c, vEndRow, c + 2);
        }
      });
    };

    handleSpecial(positions.dragon, 'dragon');
    handleSpecial(positions.goldmine, 'goldmine');

    positions.wizard.forEach(({ r, c }, index) => {
      // Horizontal 3-cell span
      addSpan(`wizard-h-${index}`, 'wizard-border-h', r, Math.max(0, c - 1), r + 2, Math.min(cols, c + 2) +1);
      // Vertical 3-cell span
      addSpan(`wizard-v-${index}`, 'wizard-border-v', Math.max(0, r - 1), c, Math.min(rows, r + 2) +1, c + 2);
    });

    return borderElements;
  }, [positions, rows, cols]);

  return <div className="special-tile-borders">{borders}</div>;
}

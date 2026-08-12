// src/traveler-config.ts
import type { TravelerConfig } from './types';

// Base set of flyers, will be used in all sections
const baseFlyers: TravelerConfig[] = [
  {
    src: "/images/fly/dragon1.png",
    direction: "left-to-right",
    duration: 12000,
    verticalPercent: 50,
    startDelay: 0,
    loop: true,
    width: 186,
    height: 'auto', 
  },
  {
    src: "/images/fly/dragon2.png",
    direction: "right-to-left",
    duration: 20000,
    verticalPercent: 20,
    startDelay: 0,
    loop: true,
    width: 372,
    height: 'auto', 
  },
];

// --- BOTTOM TRAVELERS CONFIG ---

// --- Lobby & Round 1 ---
const patrolDuration = 28000;
const totalPatrolCycle = patrolDuration * 2;
const lobbyAndRound1Bottom: TravelerConfig[] = [
  { 
    src: '/images/fly/walkleft.png',
    animationName: 'patrolRightToLeft',
    duration: totalPatrolCycle,
    verticalPercent: 84,
    startDelay: 0,
    loop: true,
    width: 252,
    height: 150,
  },
  {
    src: '/images/fly/walkright.png',
    animationName: 'patrolLeftToRight',
    duration: totalPatrolCycle,
    verticalPercent: 84,
    startDelay: 0,
    loop: true,
    width: 252,
    height: 150,
  },
];

// --- Round 2 --- 
const totalRound2Cycle = 36000;
const round2Bottom: TravelerConfig[] = [
  // --- PART 1: HUMANS RUNNING (0s - 18s) ---
  { 
    src: '/images/fly/run_1.png', 
    animationName: 'phase1LeftToRight', // Runs immediately
    duration: totalRound2Cycle,
    startDelay: 0,
    verticalPercent: 84.5,
    loop: true, width: 150, height: 150,
  },
  { 
    src: '/images/fly/run_right.png',
    animationName: 'phase1LeftToRight', // Runs immediately
    duration: totalRound2Cycle,
    startDelay: 1400, // Slight stagger within Phase 1
    verticalPercent: 83.5,
    loop: true, width: 246, height: 150,
  },
  
  // --- PART 2: DINOS CHASING (18s - 36s) ---
  {  
    src: '/images/fly/run_left.png', 
    animationName: 'phase2RightToLeft', // Waits 18s, then runs
    duration: totalRound2Cycle,
    startDelay: 0, // No extra delay needed, the animation handles the wait
    verticalPercent: 83.5,
    loop: true, width: 250, height: 150,
  },
  {
    src: '/images/fly/trex_left.png',
    animationName: 'phase2RightToLeft', // Waits 18s, then runs
    duration: totalRound2Cycle,
    startDelay: 2000, // Stagger relative to the start of the 36s cycle
    verticalPercent: 84.5,
    loop: true, width: 466, height: 150,
  },
];

// --- Round 3 ---
// 12s Left-to-Right + 12s Right-to-Left = 24s Total Cycle
const totalRound3Cycle = 24000;
const round3Bottom: TravelerConfig[] = [
  // --- PART 1: T-REX CHASE (0s - 12s) ---
  // Uses 'phase1LeftToRight': Runs immediately
  {  
    src: '/images/fly/trex_right.png',
    animationName: 'phase1LeftToRight',
    duration: totalRound3Cycle, // Must be full cycle (24000)
    startDelay: 0,
    verticalPercent: 84,
    loop: true, width: 466, height: 150,
  },
  { 
    src: '/images/fly/runright.png',
    animationName: 'phase1LeftToRight',
    duration: totalRound3Cycle, // Must be full cycle
    startDelay: 1500, // Human running ahead/behind
    verticalPercent: 83.5,
    loop: true, width: 246, height: 150,
  },

  // --- PART 2: RETREAT (12s - 24s) ---
  // Uses 'phase2RightToLeft': Waits 12s, then runs
  {
    src: '/images/fly/runleft.png', 
    animationName: 'phase2RightToLeft',
    duration: totalRound3Cycle, // Must be full cycle
    startDelay: 0, // No extra delay needed, animation waits 50%
    verticalPercent: 83.5,
    loop: true, width: 246, height: 150,
  },
  {
    src: '/images/fly/shootleft.png', 
    animationName: 'phase2RightToLeft',
    duration: totalRound3Cycle, // Must be full cycle
    startDelay: 1050, // Stagger relative to start of Phase 2
    verticalPercent: 77,
    loop: true, width: 250, height: 150,
    zIndex: 1,
  }, 
];

// --- Game Summary ---
const summaryBottom: TravelerConfig[] = [
  { 
    src: '/images/fly/run_2.gif', 
    startDelay: 0,
    direction: 'left-to-right',
    duration: 13000,
    verticalPercent: 1,
    loop: true,
    width: 195,
    height: 150, 
  },
];

// Exported object containing combined traveler configurations for each game state
export const travelerConfigs = {
  lobby: [...baseFlyers, ...lobbyAndRound1Bottom],
  round1: [...baseFlyers, ...lobbyAndRound1Bottom],
  round2: [...baseFlyers, ...round2Bottom],
  round3: [...baseFlyers, ...round3Bottom],
  summary: [...baseFlyers, ...summaryBottom],
};

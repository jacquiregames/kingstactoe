// src/constants/preloadAssets.ts

export const PRELOAD_IMAGES = [
  '/favicon.png',
  '/images/background/background.webp',
  '/images/background/yourturn.webp',
  '/images/fly/dragon1.webp', 
  '/images/fly/dragon2.webp', 
  '/images/fly/run_1.webp',
  '/images/fly/run_2.webp',
  '/images/fly/run_left.webp',
  '/images/fly/run_right.webp',
  '/images/fly/runleft.webp',
  '/images/fly/runright.webp',
  '/images/fly/shootleft.webp',
  '/images/fly/shootright.webp',
  '/images/fly/trex_left.webp',
  '/images/fly/trex_right.webp',
  '/images/fly/walkleft.webp',
  '/images/fly/walkright.webp',  
  '/images/rounds/round1.webp',
  '/images/rounds/round2.webp',
  '/images/rounds/round3.webp',
  '/images/rounds/yourturn.webp',
  '/images/rounds/game_over.webp', 
  '/images/buttons/howtoplay.webp',
  '/images/buttons/joingame.webp',
  '/images/buttons/startgame.webp',
  '/images/buttons/startround2.webp',
  '/images/buttons/startround3.webp',
  '/images/buttons/drawandplacetile.webp',
  '/images/buttons/undo.webp',
  '/images/buttons/approve.webp',
  '/images/buttons/deny.webp',
  '/images/end.webp',
  '/images/podium.webp',
  '/images/stones/blue.webp',
  '/images/stones/green.webp',
  '/images/stones/red.webp',
  '/images/stones/yellow.webp',
  '/images/stones/crown.webp',
  '/images/flames/blue_flame.webp',
  '/images/flames/green_flame.webp',
  '/images/flames/red_flame.webp',
  '/images/flames/yellow_flame.webp',
  '/images/tiles/dragon.webp',
  '/images/tiles/goldmine.webp',
  '/images/tiles/wizard.webp',
  '/images/tiles/mounta.webp',
  '/images/tiles/mountb.webp',
  ...Array.from({ length: 6 }, (_, i) => `/images/tiles/minus${i + 1}.webp`),
  ...Array.from({ length: 6 }, (_, i) => `/images/tiles/plus${i + 1}a.webp`),
  ...Array.from({ length: 6 }, (_, i) => `/images/tiles/plus${i + 1}b.webp`),
  '/images/borders/dragon_border_h.webp',
  '/images/borders/dragon_border_v.webp',
  '/images/borders/goldmine_border_h.webp',
  '/images/borders/goldmine_border_v.webp',
  '/images/borders/wizard_border_h.webp',
  '/images/borders/wizard_border_v.webp',
];

const colors = ['blue', 'green', 'red', 'yellow'];
const ranks = [1, 2, 3, 4];
 
colors.forEach(color => {
  ranks.forEach(rank => { 
    PRELOAD_IMAGES.push(`/images/castles/${color}${rank}.webp`);
  });
});

export const PRELOAD_VIDEOS = [
  '/videos/background/background.mp4', 
  '/videos/background/start.mp4',
  '/videos/rounds/round2.mp4',
  '/videos/rounds/round3.mp4',
  '/videos/rounds/gameover.mp4',
  '/videos/rounds/yourturn2.mp4',
  '/videos/rounds/wizard_dragon.mp4',
  '/videos/rounds/dragon_wizard.mp4'
];


// src/constants/preloadAssets.ts

export const PRELOAD_IMAGES = [
  '/favicon.png',
  '/images/background/background.png',
  '/images/background/yourturn.png',
  '/images/fly/dragon1.png', 
  '/images/fly/dragon2.png', 
  '/images/fly/run_1.png',
  '/images/fly/run_2.gif',
  '/images/fly/run_left.png',
  '/images/fly/run_right.png',
  '/images/fly/runleft.png',
  '/images/fly/runright.png',
  '/images/fly/shootleft.png',
  '/images/fly/shootright.png',
  '/images/fly/trex_left.png',
  '/images/fly/trex_right.png',
  '/images/fly/walkleft.png',
  '/images/fly/walkright.png',  
  '/images/rounds/round1.png',
  '/images/rounds/round2.png',
  '/images/rounds/round3.png',
  '/images/rounds/yourturn.png',
  '/images/rounds/game_over.png', 
  '/images/buttons/howtoplay.png',
  '/images/buttons/joingame.png',
  '/images/buttons/startgame.png',
  '/images/buttons/startround2.png',
  '/images/buttons/startround3.png',
  '/images/buttons/drawandplacetile.png',
  '/images/end.png', 
  '/images/stones/blue.png',
  '/images/stones/green.png',
  '/images/stones/red.png',
  '/images/stones/yellow.png',
  '/images/stones/crown.png',
  '/images/flames/blue_flame.gif',
  '/images/flames/green_flame.gif',
  '/images/flames/red_flame.gif',
  '/images/flames/yellow_flame.gif',
  '/images/tiles/dragon.webp',
  '/images/tiles/goldmine.webp',
  '/images/tiles/wizard.webp',
  '/images/tiles/mounta.webp',
  '/images/tiles/mountb.webp',
  ...Array.from({ length: 6 }, (_, i) => `/images/tiles/minus${i + 1}.webp`),
  ...Array.from({ length: 6 }, (_, i) => `/images/tiles/plus${i + 1}a.webp`),
  ...Array.from({ length: 6 }, (_, i) => `/images/tiles/plus${i + 1}b.webp`),
  '/images/borders/dragon_border_h.gif',
  '/images/borders/dragon_border_v.gif',
  '/images/borders/goldmine_border_h.gif',
  '/images/borders/goldmine_border_v.gif',
  '/images/borders/wizard_border_h.gif',
  '/images/borders/wizard_border_v.gif',
];

const colors = ['blue', 'green', 'red', 'yellow'];
const ranks = [1, 2, 3, 4];
 
colors.forEach(color => {
  ranks.forEach(rank => { 
    PRELOAD_IMAGES.push(`/images/castles/${color}${rank}.png`);
  });
});

export const PRELOAD_VIDEOS = [
  '/images/background/background.mp4', 
  '/images/background/start.mp4',
  '/images/rounds/round2.mp4',
  '/images/rounds/round3.mp4',
  '/images/rounds/gameover.mp4',
  '/images/rounds/yourturn2.mp4',
  '/images/rounds/wizard_dragon.mp4',
  '/images/rounds/dragon_wizard.mp4'
];

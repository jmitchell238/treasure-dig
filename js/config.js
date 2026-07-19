'use strict';

// Treasure Dig — Keep CACHE in sw.js in sync: 'treasure-dig-' + GAME_VERSION
const GAME_VERSION = '1.0.000';
const GAME_VERSION_LABEL = 'v' + GAME_VERSION;
const GAME_NAME = 'Treasure Dig';

const W = 390;
const H = 700;
const SAVE_KEY = 'treasure-dig-save-v1';

/** Modes: grid + treasure count + free vs challenge boards */
const MODES = {
  free:  { id: 'free',  name: 'Free Dig',   tagline: '4×4 · cozy', cols: 4, rows: 4, treasures: 4, boards: 0 },
  beach: { id: 'beach', name: 'Beach Day',  tagline: '4×5 · 5 finds', cols: 4, rows: 5, treasures: 5, boards: 4 },
  dig:   { id: 'dig',   name: 'Deep Dig',   tagline: '5×5 · 7 finds', cols: 5, rows: 5, treasures: 7, boards: 6 },
  pro:   { id: 'pro',   name: 'Treasure Pro', tagline: '5×6 · 9 finds', cols: 5, rows: 6, treasures: 9, boards: 8 },
};
const MODE_ORDER = ['free', 'beach', 'dig', 'pro'];

const HINT_AFTER = 7;

const PRAISE = ['Treasure!', 'Yay!', 'Nice!', 'Shine!', 'Wow!', 'Yes!', 'Great!', 'Found!'];
const EMPTY_PRAISE = ['Almost!', 'Keep dig!', 'Sand!', 'Hmm…', 'Peek!'];

/** Treasure kinds drawn on canvas */
const TREASURES = [
  { id: 'shell',  label: 'Shell',  color: '#FFCC80', color2: '#FF8A65' },
  { id: 'star',   label: 'Star',   color: '#FFD54F', color2: '#FF8F00' },
  { id: 'crab',   label: 'Crab',   color: '#EF5350', color2: '#C62828' },
  { id: 'coin',   label: 'Coin',   color: '#FFEE58', color2: '#F9A825' },
  { id: 'pearl',  label: 'Pearl',  color: '#E1BEE7', color2: '#CE93D8' },
  { id: 'anchor', label: 'Anchor', color: '#90A4AE', color2: '#546E7A' },
  { id: 'fish',   label: 'Fish',   color: '#4FC3F7', color2: '#0288D1' },
  { id: 'gem',    label: 'Gem',    color: '#66BB6A', color2: '#2E7D32' },
];

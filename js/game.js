'use strict';

/** @type {'menu'|'play'|'win'} */
let state = 'menu';

/** @type {{ col: number, row: number, x: number, y: number, dug: boolean, treasure: object|null, pop: number }[]} */
let tiles = [];
let cols = 4;
let rows = 4;
let tileSize = 70;
let gridX = 0;
let gridY = 0;

let modeId = 'beach';
let boardNum = 0;
let boardsTarget = 0;
let sessionFinds = 0;
let foundThisBoard = 0;
let needThisBoard = 0;
let winFlash = 0;
let hintTimer = 0;
let seaPhase = 0;
let celebrating = false;
let shovelX = -1;
let shovelY = -1;
let shovelT = 0;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function currentMode() {
  return MODES[modeId] || MODES.beach;
}

function layoutBoard() {
  const m = currentMode();
  cols = m.cols | 0;
  rows = m.rows | 0;
  needThisBoard = Math.min(m.treasures | 0, cols * rows);
  foundThisBoard = 0;
  celebrating = false;

  const marginX = 22;
  const topPad = 118;
  const botPad = 100;
  const availW = W - marginX * 2;
  const availH = H - topPad - botPad;
  tileSize = Math.floor(Math.min(availW / cols, availH / rows) - 4);
  const gridW = cols * tileSize + (cols - 1) * 6;
  const gridH = rows * tileSize + (rows - 1) * 6;
  gridX = (W - gridW) / 2;
  gridY = topPad + (availH - gridH) / 2;

  const total = cols * rows;
  const treasureIdx = new Set(shuffle([...Array(total).keys()]).slice(0, needThisBoard));
  const kinds = shuffle(TREASURES);

  tiles = [];
  let t = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const x = gridX + c * (tileSize + 6) + tileSize / 2;
      const y = gridY + r * (tileSize + 6) + tileSize / 2;
      const has = treasureIdx.has(i);
      tiles.push({
        col: c, row: r, x, y,
        dug: false,
        treasure: has ? kinds[t++ % kinds.length] : null,
        pop: 0,
        bob: Math.random() * Math.PI * 2,
      });
    }
  }

  hintTimer = 0;
  shovelT = 0;
}

function enterPlay(forceMode) {
  state = 'play';
  modeId = forceMode || save.mode || 'beach';
  const m = currentMode();
  boardsTarget = m.boards | 0;
  boardNum = 0;
  sessionFinds = 0;
  winFlash = 0;
  clearParticles();
  layoutBoard();
}

function enterMenu() {
  state = 'menu';
  clearParticles();
}

function enterWin() {
  state = 'win';
  winFlash = 1.5;
  sfxWin();
  spawnBurst(W / 2, H * 0.4, '#FFD56A', 28);
  spawnBurst(W / 2, H * 0.4, '#4FC3F7', 18);
  spawnPraise(W / 2, H * 0.28, 'Beach clear!');
  recordBoard();
}

function allFound() {
  return tiles.filter(t => t.treasure).every(t => t.dug);
}

function nextBoardOrWin() {
  recordBoard();
  boardNum++;
  const m = currentMode();
  if (!m.boards) {
    sfxFind();
    spawnPraise(W / 2, 120, 'Again!');
    layoutBoard();
    return;
  }
  if (boardNum >= boardsTarget) {
    enterWin();
  } else {
    sfxFind();
    spawnPraise(W / 2, 100, 'Beach ' + (boardNum + 1) + '!');
    layoutBoard();
  }
}

function hitTile(x, y) {
  let best = null;
  let bestD = Infinity;
  const half = tileSize / 2 + 4;
  for (const t of tiles) {
    if (t.dug) continue;
    const dx = Math.abs(x - t.x);
    const dy = Math.abs(y - t.y);
    if (dx <= half && dy <= half) {
      const d = dx * dx + dy * dy;
      if (d < bestD) { best = t; bestD = d; }
    }
  }
  return best;
}

function firstUndugTreasure() {
  return tiles.find(t => t.treasure && !t.dug) || null;
}

function onTap(x, y) {
  if (state !== 'play' || celebrating) return;

  const tile = hitTile(x, y);
  if (!tile) return;

  tile.dug = true;
  tile.pop = 0.4;
  shovelX = tile.x;
  shovelY = tile.y;
  shovelT = 0.35;
  spawnSand(tile.x, tile.y);
  hintTimer = 0;

  if (tile.treasure) {
    foundThisBoard++;
    sessionFinds++;
    recordFind();
    sfxFind();
    spawnBurst(tile.x, tile.y, tile.treasure.color, 16);
    spawnPraise(tile.x, tile.y - 36, tile.treasure.label + '!');

    if (allFound()) {
      celebrating = true;
      setTimeout(() => {
        if (state === 'play' && allFound()) nextBoardOrWin();
      }, save.reducedMotion ? 450 : 750);
    }
  } else {
    sfxEmpty();
    sfxDig();
    spawnPraise(
      tile.x, tile.y - 28,
      EMPTY_PRAISE[Math.floor(Math.random() * EMPTY_PRAISE.length)]
    );
  }
}

function updatePlay(dt) {
  seaPhase += dt;
  hintTimer += dt;
  if (shovelT > 0) shovelT = Math.max(0, shovelT - dt);

  for (const t of tiles) {
    t.bob += dt * 1.8;
    if (t.pop > 0) t.pop = Math.max(0, t.pop - dt);
  }

  if (hintTimer > HINT_AFTER && !celebrating) {
    const target = firstUndugTreasure();
    if (target && Math.floor(hintTimer * 3) !== Math.floor((hintTimer - dt) * 3)) {
      spawnSparkle(target.x, target.y - 4);
      if (Math.floor(hintTimer) !== Math.floor(hintTimer - dt) && Math.floor(hintTimer) % 3 === 0) {
        sfxHint();
      }
    }
  }

  updateParticles(dt);
}

function updateWin(dt) {
  winFlash = Math.max(0, winFlash - dt);
  updateParticles(dt);
}

// ---- Drawing ----

function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawBeachBg(ctx) {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.42);
  sky.addColorStop(0, '#81D4FA');
  sky.addColorStop(1, '#E1F5FE');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Sun
  ctx.fillStyle = 'rgba(255, 236, 120, 0.95)';
  ctx.beginPath();
  ctx.arc(W - 55, 55, 30, 0, Math.PI * 2);
  ctx.fill();

  // Sea
  const seaTop = H * 0.28;
  const sea = ctx.createLinearGradient(0, seaTop, 0, H * 0.48);
  sea.addColorStop(0, '#4FC3F7');
  sea.addColorStop(1, '#29B6F6');
  ctx.fillStyle = sea;
  ctx.beginPath();
  ctx.moveTo(0, seaTop + 10);
  for (let x = 0; x <= W; x += 16) {
    const y = seaTop + Math.sin(x * 0.05 + seaPhase * 1.4) * 5;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H * 0.48);
  ctx.lineTo(0, H * 0.48);
  ctx.closePath();
  ctx.fill();

  // Sand beach
  const sand = ctx.createLinearGradient(0, H * 0.42, 0, H);
  sand.addColorStop(0, '#FFE082');
  sand.addColorStop(0.4, '#FFD54F');
  sand.addColorStop(1, '#FFCA28');
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.45);
  for (let x = 0; x <= W; x += 20) {
    ctx.lineTo(x, H * 0.45 + Math.sin(x * 0.03 + 1) * 4);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // Palm fronds left
  ctx.strokeStyle = '#558B2F';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(18, 80);
    ctx.quadraticCurveTo(40 + i * 8, 100 + i * 12, 20 + i * 14, 140 + i * 10);
    ctx.stroke();
  }
}

function drawTreasureSprite(ctx, tr, x, y, r, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const id = tr.id;

  if (id === 'shell') {
    ctx.fillStyle = tr.color;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.7);
    ctx.quadraticCurveTo(-r, 0, -r * 0.3, -r * 0.7);
    ctx.quadraticCurveTo(0, -r * 0.3, r * 0.3, -r * 0.7);
    ctx.quadraticCurveTo(r, 0, 0, r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = tr.color2;
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(0, r * 0.5);
      ctx.quadraticCurveTo(i * r * 0.25, 0, i * r * 0.15, -r * 0.5);
      ctx.stroke();
    }
  } else if (id === 'star') {
    ctx.fillStyle = tr.color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      const a2 = a + Math.PI / 5;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a2) * r * 0.42, Math.sin(a2) * r * 0.42);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = tr.color2;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (id === 'crab') {
    ctx.fillStyle = tr.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.75, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // claws
    ctx.beginPath();
    ctx.arc(-r * 0.85, -r * 0.15, r * 0.28, 0, Math.PI * 2);
    ctx.arc(r * 0.85, -r * 0.15, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    // eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.45, r * 0.18, 0, Math.PI * 2);
    ctx.arc(r * 0.25, -r * 0.45, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.45, r * 0.08, 0, Math.PI * 2);
    ctx.arc(r * 0.25, -r * 0.45, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'coin') {
    ctx.fillStyle = tr.color;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = tr.color2;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = 'bold ' + Math.floor(r * 0.9) + 'px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = tr.color2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 1);
  } else if (id === 'pearl') {
    const g = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 2, 0, 0, r);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.5, tr.color);
    g.addColorStop(1, tr.color2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    // shell half under
    ctx.fillStyle = '#FFCC80';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.45, r * 0.85, r * 0.35, 0, 0, Math.PI);
    ctx.fill();
  } else if (id === 'anchor') {
    ctx.strokeStyle = tr.color2;
    ctx.fillStyle = tr.color;
    ctx.lineWidth = r * 0.22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -r * 0.55, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.3);
    ctx.lineTo(0, r * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, r * 0.35, r * 0.55, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, 0);
    ctx.lineTo(r * 0.35, 0);
    ctx.stroke();
  } else if (id === 'fish') {
    ctx.fillStyle = tr.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.8, r * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.65, 0);
    ctx.lineTo(r * 1.15, -r * 0.4);
    ctx.lineTo(r * 1.15, r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.1, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-r * 0.32, -r * 0.1, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // gem
    ctx.fillStyle = tr.color;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.75, -r * 0.2);
    ctx.lineTo(r * 0.45, r * 0.85);
    ctx.lineTo(-r * 0.45, r * 0.85);
    ctx.lineTo(-r * 0.75, -r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.7);
    ctx.lineTo(r * 0.3, -r * 0.15);
    ctx.lineTo(0, r * 0.1);
    ctx.lineTo(-r * 0.15, -r * 0.1);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawTiles(ctx) {
  const hint = firstUndugTreasure();

  for (const t of tiles) {
    const half = tileSize / 2;
    const pop = t.pop > 0 ? Math.sin((1 - t.pop / 0.4) * Math.PI) * 0.08 : 0;
    const s = 1 + pop;

    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(s, s);

    if (!t.dug) {
      // Sand mound tile
      const g = ctx.createLinearGradient(-half, -half, half, half);
      g.addColorStop(0, '#FFE082');
      g.addColorStop(0.5, '#FFD54F');
      g.addColorStop(1, '#FFB300');
      ctx.fillStyle = g;
      roundRect(ctx, -half + 2, -half + 2, tileSize - 4, tileSize - 4, 12);
      ctx.fill();
      // Speckles
      ctx.fillStyle = 'rgba(255, 160, 0, 0.25)';
      for (let i = 0; i < 5; i++) {
        const sx = ((i * 37 + t.col * 13) % 20) - 10;
        const sy = ((i * 19 + t.row * 17) % 20) - 10;
        ctx.beginPath();
        ctx.arc(sx * half * 0.08, sy * half * 0.08, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      roundRect(ctx, -half + 8, -half + 8, tileSize * 0.45, tileSize * 0.22, 8);
      ctx.fill();

      // Hint ring
      if (hint === t && hintTimer > HINT_AFTER) {
        const pulse = 0.35 + 0.35 * Math.sin(hintTimer * 5);
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#FFF59D';
        ctx.lineWidth = 4;
        roundRect(ctx, -half - 3, -half - 3, tileSize + 6, tileSize + 6, 14);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    } else {
      // Dug pit
      ctx.fillStyle = '#E0A84A';
      roundRect(ctx, -half + 2, -half + 2, tileSize - 4, tileSize - 4, 12);
      ctx.fill();
      ctx.fillStyle = 'rgba(121, 85, 72, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 4, half * 0.55, half * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      if (t.treasure) {
        const bob = Math.sin(t.bob) * 2;
        drawTreasureSprite(ctx, t.treasure, 0, bob - 2, tileSize * 0.28, 1);
      } else {
        // Empty X soft
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        const m = half * 0.25;
        ctx.beginPath();
        ctx.moveTo(-m, -m);
        ctx.lineTo(m, m);
        ctx.moveTo(m, -m);
        ctx.lineTo(-m, m);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // Mini shovel tap FX
  if (shovelT > 0) {
    ctx.save();
    ctx.globalAlpha = shovelT / 0.35;
    ctx.translate(shovelX + 18, shovelY - 18);
    ctx.rotate(-0.4 + (1 - shovelT / 0.35) * 0.5);
    ctx.fillStyle = '#90A4AE';
    ctx.fillRect(-3, -18, 6, 22);
    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.lineTo(10, 4);
    ctx.lineTo(6, 16);
    ctx.lineTo(-6, 16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawHud(ctx) {
  const m = currentMode();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  roundRect(ctx, 14, 12, W - 28, 58, 14);
  ctx.fill();

  ctx.font = 'bold 17px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(m.name, W / 2, 30);

  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  const progress = foundThisBoard + ' / ' + needThisBoard + ' treasures';
  if (m.boards) {
    ctx.fillText('Beach ' + (boardNum + 1) + ' / ' + boardsTarget + ' · ' + progress, W / 2, 50);
  } else {
    ctx.fillText(progress + ' · Free Dig', W / 2, 50);
  }

  // Tray of found kinds this board
  const trayY = H - 52;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  roundRect(ctx, 14, trayY - 8, W - 28, 48, 12);
  ctx.fill();

  const found = tiles.filter(t => t.treasure && t.dug);
  const remaining = needThisBoard - foundThisBoard;
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'left';
  ctx.fillText('Found:', 28, trayY + 14);

  found.slice(0, 8).forEach((t, i) => {
    drawTreasureSprite(ctx, t.treasure, 90 + i * 32, trayY + 14, 12, 1);
  });
  if (remaining > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'right';
    ctx.fillText(remaining + ' left', W - 28, trayY + 14);
  }
}

function drawPlay(ctx) {
  drawBeachBg(ctx);
  drawTiles(ctx);
  drawParticles(ctx);
  drawHud(ctx);

  ctx.font = '14px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(80,50,20,0.55)';
  ctx.textAlign = 'center';
  ctx.fillText('Tap sand to dig for treasure!', W / 2, H - 70);
}

function drawWinScene(ctx) {
  drawBeachBg(ctx);
  drawTiles(ctx);
  drawParticles(ctx);
  if (winFlash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.14 * Math.min(1, winFlash)) + ')';
    ctx.fillRect(0, 0, W, H);
  }
}

function drawMenuBackdrop(ctx) {
  drawBeachBg(ctx);
  // Demo tiles
  const demo = TREASURES.slice(0, 4);
  demo.forEach((tr, i) => {
    const x = 70 + i * 80;
    const y = 340;
    ctx.fillStyle = '#FFD54F';
    roundRect(ctx, x - 32, y - 32, 64, 64, 12);
    ctx.fill();
    if (i % 2 === 0) drawTreasureSprite(ctx, tr, x, y, 18, 1);
  });
  ctx.fillStyle = 'rgba(20, 40, 60, 0.4)';
  ctx.fillRect(0, 0, W, H);
}

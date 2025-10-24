// Game logic for Core Values Crossword (word search style)
(() => {
  const GRID_SIZE = 18; // Fit longest words like CONFIDENTIALITY comfortably
  const DIRECTIONS = [
    { r: 0, c: 1 },   // E
    { r: 0, c: -1 },  // W
    { r: 1, c: 0 },   // S
    { r: -1, c: 0 },  // N
    { r: 1, c: 1 },   // SE
    { r: 1, c: -1 },  // SW
    { r: -1, c: 1 },  // NE
    { r: -1, c: -1 }, // NW
  ];

  const gridEl = () => document.getElementById('grid');
  const gridWrapper = () => document.getElementById('gridWrapper');
  const toFindList = () => document.getElementById('toFindList');
  const progressText = () => document.getElementById('progressText');
  const tooltip = () => document.getElementById('tooltip');
  const winModal = () => document.getElementById('winModal');
  const listFor = (key) => document.getElementById(`list-${key}`);

  let grid = [];
  let placements = []; // { word, cells: [{r,c}], companies:[...] }
  let found = new Set();
  let isDragging = false;
  let startCell = null;
  let currentPath = [];
  let lastPointer = { x: 0, y: 0 };

  function randInt(n) { return Math.floor(Math.random() * n); }
  function inBounds(r,c) { return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE; }

  function emptyGrid() {
    grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));
  }

  function canPlace(word, r, c, dir) {
    const len = word.length;
    let rr = r, cc = c;
    for (let i = 0; i < len; i++) {
      if (!inBounds(rr, cc)) return false;
      const existing = grid[rr][cc];
      if (existing && existing !== word[i]) return false;
      rr += dir.r; cc += dir.c;
    }
    return true;
  }

  function placeWord(word) {
    const dirs = [...DIRECTIONS];
    for (let attempt = 0; attempt < 400; attempt++) {
      const dir = dirs[randInt(dirs.length)];
      const r = randInt(GRID_SIZE);
      const c = randInt(GRID_SIZE);
      const forward = Math.random() > 0.5; // allow reverse
      const letters = forward ? word : [...word].reverse().join('');
      if (!canPlace(letters, r, c, dir)) continue;
      let rr = r, cc = c;
      const cells = [];
      for (let i = 0; i < letters.length; i++) {
        grid[rr][cc] = letters[i];
        cells.push({ r: rr, c: cc });
        rr += dir.r; cc += dir.c;
      }
      return cells; // success
    }
    return null; // failed
  }

  function fillRandom() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!grid[r][c]) grid[r][c] = letters[randInt(letters.length)];
      }
    }
  }

  function generate() {
    emptyGrid();
    placements = [];

    // Sort words longest-first helps placement
    const words = [...window.CORE_VALUES.map(v => v.word)].sort((a,b)=>b.length-a.length);

    for (const w of words) {
      const placed = placeWord(w);
      if (!placed) {
        // If placement fails, regenerate completely to avoid partial fits
        return generate();
      }
      const companies = window.CORE_VALUES.find(cv => cv.word === w).companies;
      placements.push({ word: w, cells: placed, companies });
    }

    fillRandom();
  }

  function cellId(r,c) { return `cell-${r}-${c}`; }

  function renderGrid() {
    const size = GRID_SIZE;
    gridEl().style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;
    gridEl().innerHTML = '';

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const div = document.createElement('div');
        div.id = cellId(r,c);
        div.dataset.r = String(r);
        div.dataset.c = String(c);
  div.className = 'grid-cell bg-[#fed41f] text-zinc-900 font-semibold rounded-md flex items-center justify-center border border-yellow-500/60 shadow-sm text-sm md:text-base';
        div.textContent = grid[r][c];
        gridEl().appendChild(div);
      }
    }
  }

  function renderToFind() {
    const ul = toFindList();
    ul.innerHTML = '';
    for (const { word, companies } of window.CORE_VALUES) {
      const li = document.createElement('li');
      li.dataset.word = word;
      li.className = 'px-2 py-1 rounded-full border bg-amber-50 border-amber-200 text-zinc-700';
      li.title = companies.join(' & ');
      li.innerHTML = `<span class="chip-text font-semibold">${word}</span>`;
      ul.appendChild(li);
    }
  }

  function updateProgress() {
    const total = window.CORE_VALUES.length;
    const done = found.size;
    progressText().textContent = `${done} / ${total} found`;
  }

  function clearTempSelection() {
    for (const el of gridEl().querySelectorAll('.selected-temp')) {
      el.classList.remove('selected-temp');
    }
    currentPath = [];
  }

  function pointerCellFromEvent(e) {
    const pt = (e.touches && e.touches[0]) || e;
    lastPointer = { x: pt.clientX, y: pt.clientY };
    const el = document.elementFromPoint(pt.clientX, pt.clientY);
    if (!el) return null;
    const cell = el.closest('.grid-cell');
    if (!cell) return null;
    const r = parseInt(cell.dataset.r, 10);
    const c = parseInt(cell.dataset.c, 10);
    return { r, c, el: cell };
  }

  function directionFrom(start, curr) {
    const dr = Math.sign(curr.r - start.r);
    const dc = Math.sign(curr.c - start.c);
    // If both zero (same cell), default to E
    if (dr === 0 && dc === 0) return { r: 0, c: 1 };
    return { r: dr, c: dc };
  }

  function buildPath(start, curr) {
    const dir = directionFrom(start, curr);
    const path = [];
    let r = start.r, c = start.c;
    path.push({ r, c });
    while (r !== curr.r || c !== curr.c) {
      r += dir.r; c += dir.c;
      if (!inBounds(r,c)) break;
      path.push({ r, c });
    }
    return path;
  }

  function lettersFromPath(path) {
    return path.map(p => grid[p.r][p.c]).join('');
  }

  function pathEquals(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].r !== b[i].r || a[i].c !== b[i].c) return false;
    }
    return true;
  }

  function isValidWord(word) {
    const upper = word.toUpperCase();
    const match = window.CORE_VALUES.find(cv => cv.word === upper);
    if (match) return match;
    const rev = [...upper].reverse().join('');
    return window.CORE_VALUES.find(cv => cv.word === rev) || null;
  }

  function isPathPlaced(path) {
    for (const p of placements) {
      if (pathEquals(p.cells, path)) return p;
      const rev = [...p.cells].slice().reverse();
      if (pathEquals(rev, path)) return p;
    }
    return null;
  }

  function showTooltip() {
    const t = tooltip();
    t.style.left = `${lastPointer.x + 10}px`;
    t.style.top = `${lastPointer.y + 10}px`;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 1200);
  }

  function shakeGrid() {
    const w = gridWrapper();
    w.classList.add('shake');
    setTimeout(() => w.classList.remove('shake'), 450);
  }

  function markFound(path, companyKeys, word) {
    // Persist highlighting
    const multi = companyKeys.length > 1;
    for (const { r, c } of path) {
      const el = document.getElementById(cellId(r,c));
      el.classList.add('found-glow');
      if (multi) {
        el.classList.add('multi-stripe');
      } else {
        el.style.backgroundColor = COMPANY_COLOR_BY_KEY[companyKeys[0]];
        el.style.color = '#111827';
        el.style.borderColor = '#ffffffaa';
      }
    }

    // Mark in side list
    const li = toFindList().querySelector(`[data-word="${word}"]`);
    if (li) {
      li.classList.add('opacity-60');
      const span = li.querySelector('.chip-text');
      if (span) span.classList.add('line-through');
    }

    // Fly label to each company bucket
    for (const key of companyKeys) {
      flyToCompany(word, key, path);
      const list = listFor(key);
      const item = document.createElement('li');
      item.textContent = word;
      item.className = 'px-2 py-1 rounded bg-zinc-50 border';
      item.style.borderColor = COMPANY_COLOR_BY_KEY[key] + '55';
      item.style.color = '#111827';
      list.appendChild(item);
    }

    found.add(word);
    updateProgress();

    if (found.size === window.CORE_VALUES.length) {
      setTimeout(() => celebrateWin(), 300);
    }
  }

  function flyToCompany(word, companyKey, path) {
    // Compute start position (center of first cell)
    const first = path[0];
    const startEl = document.getElementById(cellId(first.r, first.c));
    const startRect = startEl.getBoundingClientRect();
    const startX = startRect.left + startRect.width/2;
    const startY = startRect.top + startRect.height/2;

    const targetList = listFor(companyKey);
    const targetRect = targetList.getBoundingClientRect();
    const endX = targetRect.left + 20;
    const endY = targetRect.top + 12;

    const label = document.createElement('div');
    label.className = 'fly-label px-2 py-1 rounded font-semibold';
    label.textContent = word;

    if (path.length > 0 && path.length !== word.length) {
      // If reversed, color still same
    }

    // Color
    if (COMPANY_COLOR_BY_KEY[companyKey]) {
      label.style.background = COMPANY_COLOR_BY_KEY[companyKey];
      label.style.color = '#111827';
    } else {
      label.style.background = '#e5e7eb';
    }

    label.style.transform = `translate(${startX}px, ${startY}px)`;
    label.style.transition = 'transform 600ms ease, opacity 600ms ease';
    label.style.opacity = '1';

    document.body.appendChild(label);

    requestAnimationFrame(() => {
      label.style.transform = `translate(${endX}px, ${endY}px)`;
      label.style.opacity = '0';
    });

    setTimeout(() => label.remove(), 650);
  }

  function celebrateWin() {
    // Confetti burst
    if (window.confetti) {
      const duration = 1500;
      const end = Date.now() + duration;
      (function frame() {
        confetti({
          particleCount: 3,
          spread: 70,
          startVelocity: 45,
          origin: { x: Math.random(), y: Math.random() - 0.2 }
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }

    const modal = winModal();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function resetState() {
    found = new Set();
    for (const key of Object.keys(COMPANY_COLOR_BY_KEY)) {
      listFor(key).innerHTML = '';
    }
    renderToFind();
    updateProgress();
  }

  function rebuild() {
    generate();
    renderGrid();
    resetState();
  }

  // Event wiring for selection
  function onPointerDown(e) {
    const hit = pointerCellFromEvent(e);
    if (!hit) return;
    isDragging = true;
    startCell = { r: hit.r, c: hit.c };
    currentPath = [{ r: hit.r, c: hit.c }];
    hit.el.classList.add('selected-temp');
  }

  function onPointerMove(e) {
    if (!isDragging || !startCell) return;
    const hit = pointerCellFromEvent(e);
    if (!hit) return;
    const path = buildPath(startCell, { r: hit.r, c: hit.c });
    // Clear previous temp
    clearTempSelection();
    currentPath = path;
    for (const p of path) {
      const el = document.getElementById(cellId(p.r, p.c));
      el && el.classList.add('selected-temp');
    }
    if (e.cancelable) e.preventDefault();
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;

    const word = lettersFromPath(currentPath);
    const match = isValidWord(word);
    const placed = isPathPlaced(currentPath);

    if (match && placed && !found.has(placed.word)) {
      // Determine company keys
      const companyKeys = match.companies.map(name => COMPANY_KEY_BY_NAME[name]);
      markFound(placed.cells, companyKeys, placed.word);
    } else {
      // Invalid feedback
      showTooltip();
      shakeGrid();
    }

    clearTempSelection();
  }

  function bindPointerEvents() {
    const root = gridWrapper();
    // Mouse
    root.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    // Touch
    root.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
  }

  function initUI() {
    // Landing -> Game transition
    const landing = document.getElementById('landing');
    const game = document.getElementById('game');
    document.getElementById('playBtn').addEventListener('click', () => {
      landing.classList.add('hidden');
      game.classList.remove('hidden');
      game.classList.add('animate-fadeIn');
      rebuild();
    });

    // Back to landing
    document.getElementById('backBtn').addEventListener('click', () => {
      // Hide modal/tooltip and clear temp selection
      winModal().classList.add('hidden');
      winModal().classList.remove('flex');
      tooltip().classList.add('hidden');
      clearTempSelection();
      // Show landing
      game.classList.add('hidden');
      landing.classList.remove('hidden');
    });

    document.getElementById('shuffleBtn').addEventListener('click', () => {
      rebuild();
    });

    document.getElementById('playAgainBtn').addEventListener('click', () => {
      winModal().classList.add('hidden');
      winModal().classList.remove('flex');
      rebuild();
    });
  }

  // Boot
  window.addEventListener('DOMContentLoaded', () => {
    renderToFind();
    updateProgress();
    bindPointerEvents();
    initUI();
  });
})();

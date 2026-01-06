const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold');
const holdContext = holdCanvas.getContext('2d');

context.scale(20, 20);
nextContext.scale(20, 20);
holdContext.scale(20, 20);

const colors = [
    null,
    '#FF0D0D', // I - Red
    '#FFE138', // L - Yellow
    '#0DFF72', // J - Green
    '#FF8E0D', // O - Orange
    '#F538FF', // Z - Purple
    '#0DC2FF', // S - Cyan
    '#3877FF', // T - Blue
];

let sweepRows = [];
let isSweeping = false;
let startTime = 0;
let timerInterval = null;

function updateTimer() {
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.innerText = `${minutes}:${seconds}`;
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
}

function arenaSweep() {
    let rowsToClear = [];
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }
        rowsToClear.push(y);
    }

    if (rowsToClear.length > 0) {
        sweepRows = rowsToClear;
        isSweeping = true;
        playSound('clear');

        // Wait 800ms before clearing (Extended delay as requested)
        setTimeout(() => {
            finalizeSweep(rowsToClear);
        }, 800);
    }
}

function finalizeSweep(rows) {
    let rowCount = 1;
    // Sort ascending to remove from top first if we rely on constant index unshift
    // Actually, simply processing from TOP to BOTTOM is safest when unshifting at TOP.
    // Top rows have lower indices.
    // Example: Remove 1 and 2.
    // Remove 1. Unshift at 0. Old 2 moves to 3? No, old 2 was at 2.
    // Unshift shifts everything down.
    // So old 2 moves to 3.
    // So we must adjust or process carefully.

    // Simplest robust method:
    // Remove all rows by index, then add that many new rows.
    // But rows.forEach does it one by one.

    // Correct logic with splice+unshift one-by-one:
    // Sort Ascending (a-b).
    // y=1. Splice 1. Arena shrinks. Unshift 0. Arena grows.
    // Row at 2 (target) is now at 2 (because unshift pushes it back).
    // So Ascending order works perfectly with splice+unshift pair.

    rows.sort((a, b) => a - b);

    rows.forEach(y => {
        const row = arena.splice(y, 1)[0];
        arena.unshift(row.fill(0));
        player.score += rowCount * 10;
        rowCount *= 2;
        player.lines++;
    });

    sweepRows = [];
    isSweeping = false;
    updateScore();
    updateLines();
}

function updateLines() {
    const linesElement = document.getElementById('lines');
    if (linesElement) {
        linesElement.innerText = player.lines;
    }
}

function collide(arena, player) {
    const m = player.matrix;
    const o = player.pos;
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
               (arena[y + o.y] &&
                arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    if (type === 'I') {
        return [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
        ];
    } else if (type === 'L') {
        return [
            [0, 2, 0],
            [0, 2, 0],
            [0, 2, 2],
        ];
    } else if (type === 'J') {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [3, 3, 0],
        ];
    } else if (type === 'O') {
        return [
            [4, 4],
            [4, 4],
        ];
    } else if (type === 'Z') {
        return [
            [5, 5, 0],
            [0, 5, 5],
            [0, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (type === 'T') {
        return [
            [0, 7, 0],
            [7, 7, 7],
            [0, 0, 0],
        ];
    }
}

// Pre-render block images
const blockImages = {};
function createBlockImage(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 20;
    const ctx = canvas.getContext('2d');

    // Base color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 20, 20);

    // Bevel effect (Lighting)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(20, 0);
    ctx.lineTo(16, 4);
    ctx.lineTo(4, 4);
    ctx.lineTo(4, 16);
    ctx.lineTo(0, 20);
    ctx.closePath();
    ctx.fill();

    // Bevel effect (Shadow)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(20, 20);
    ctx.lineTo(0, 20);
    ctx.lineTo(4, 16);
    ctx.lineTo(16, 16);
    ctx.lineTo(16, 4);
    ctx.closePath();
    ctx.fill();

    // Inner border for definition
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.strokeRect(0,0,20,20);

    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
}

// Initialize block images
colors.forEach((color, index) => {
    if (color) {
        blockImages[index] = createBlockImage(color);
    }
});

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        const absY = y + offset.y;
        let isClearing = false;

        if (matrix === arena && sweepRows.includes(absY)) {
             isClearing = true;
        }

        row.forEach((value, x) => {
            if (value !== 0 && blockImages[value]) {
                if (isClearing) {
                    context.fillStyle = '#fff';
                    context.fillRect(x + offset.x, y + offset.y, 1, 1);
                } else {
                    context.drawImage(blockImages[value], x + offset.x, y + offset.y, 1, 1);
                }
            }
        });
    });
}

function drawNext() {
    nextContext.fillStyle = '#000';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    let yOffset = 1;
    // Draw up to 4 pieces
    for (let i = 0; i < Math.min(nextQueue.length, 4); i++) {
        const piece = nextQueue[i];
        const offset = {
            x: (nextCanvas.width / 20 - piece[0].length) / 2,
            y: yOffset
        };

        piece.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0 && blockImages[value]) {
                    nextContext.drawImage(blockImages[value], x + offset.x, y + offset.y, 1, 1);
                }
            });
        });

        // Move down for next piece (approx 4 units height + 1 padding)
        yOffset += piece.length + 1;
    }
}

function drawHold() {
    holdContext.fillStyle = '#000';
    holdContext.fillRect(0, 0, holdCanvas.width, holdCanvas.height);

    if (holdPiece) {
        const offset = {
            x: (holdCanvas.width / 20 - holdPiece[0].length) / 2,
            y: (holdCanvas.height / 20 - holdPiece.length) / 2
        };

        holdPiece.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0 && blockImages[value]) {
                    holdContext.drawImage(blockImages[value], x + offset.x, y + offset.y, 1, 1);
                }
            });
        });
    }
}

function draw() {
    // Clear canvas to reveal CSS grid background
    context.clearRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, {x: 0, y: 0});

    // Draw Ghost Piece first
    drawGhost();

    drawMatrix(player.matrix, player.pos);
    drawNext();
    drawHold();
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }

    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerHardDrop() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
    dropCounter = 0;
}

function playerMove(offset) {
    player.pos.x += offset;
    if (collide(arena, player)) {
        player.pos.x -= offset;
    }
}

let nextQueue = [];
let holdPiece = null;
let canHold = true;
let showGhost = true;
let mobileControlsMode = false;

function toggleControlsMode() {
    mobileControlsMode = !mobileControlsMode;
    const btn = document.getElementById('controls-mode-btn');
    const controlsDiv = document.getElementById('mobile-controls');

    if (mobileControlsMode) {
        btn.innerText = "Controls: Mobile";
        controlsDiv.classList.remove('hidden');
    } else {
        btn.innerText = "Controls: PC";
        controlsDiv.classList.add('hidden');
    }
}

function toggleControlsHelp() {
    const list = document.getElementById('controls-list');
    const arrow = document.getElementById('ctrl-arrow');
    // Logic: if hidden, show it (remove hidden).
    // Initial state in HTML: no hidden class.
    // If we want to toggle:
    if (list.classList.contains('hidden')) {
        list.classList.remove('hidden');
        arrow.innerText = '▼';
    } else {
        list.classList.add('hidden');
        arrow.innerText = '▲';
    }
}

// Mobile Controls Event Listeners
const mobileBtnMap = {
    'btn-left': () => { playerMove(-1); playSound('move'); },
    'btn-right': () => { playerMove(1); playSound('move'); },
    'btn-down': () => { playerDrop(); },
    'btn-rotate': () => { playerRotate(1); playSound('rotate'); },
    'btn-hard-drop': () => { playerHardDrop(); playSound('drop'); },
    'btn-hold': () => { playerHold(); }
};

Object.keys(mobileBtnMap).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
        // Prevent default to stop scrolling/zooming on double tap
        const handleInput = (e) => {
            if (e.cancelable) e.preventDefault();
            if (!isGameActive || isSweeping) return;
            mobileBtnMap[id]();
        };

        btn.addEventListener('touchstart', handleInput, {passive: false});
        btn.addEventListener('mousedown', handleInput);
    }
});

function toggleGhost() {
    showGhost = !showGhost;
    const btn = document.getElementById('ghost-btn');
    if (btn) btn.innerText = showGhost ? "Ghost: ON" : "Ghost: OFF";
    draw();
}

function drawGhost() {
    if (!showGhost || !player.matrix) return;

    // Create a ghost player object
    const ghost = {
        matrix: player.matrix,
        pos: { x: player.pos.x, y: player.pos.y }
    };

    // Drop until collision
    while (!collide(arena, ghost)) {
        ghost.pos.y++;
    }
    ghost.pos.y--; // Step back one step (to valid position)

    // Render with transparency
    context.save();
    context.globalAlpha = 0.2;
    drawMatrix(ghost.matrix, ghost.pos);
    context.restore();
}

function playerReset() {
    const pieces = 'ILJOTSZ';
    // Initialize queue if empty
    while (nextQueue.length < 4) {
        nextQueue.push(createPiece(pieces[pieces.length * Math.random() | 0]));
    }

    player.matrix = nextQueue.shift();
    nextQueue.push(createPiece(pieces[pieces.length * Math.random() | 0]));

    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) -
                   (player.matrix[0].length / 2 | 0);

    canHold = true; // Reset hold ability for new turn
    drawNext();
    drawHold();

    if (collide(arena, player)) {
        gameOver();
    }
}

function playerHold() {
    if (!canHold || isGameOver) return;

    if (holdPiece) {
        // Swap
        const temp = player.matrix;
        player.matrix = holdPiece;
        holdPiece = temp;
        player.pos.y = 0;
        player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    } else {
        // First hold
        holdPiece = player.matrix;
        playerReset(); // Get next piece from queue
        // playerReset resets canHold to true, but we consumed our hold action for this "turn"
        // (which is actually the turn of the piece we just grabbed).
        // Logic: if I hold, I get a new piece. Can I hold that new piece immediately? Usually no.
    }

    canHold = false;
    drawHold();
    drawNext(); // Reset calls it but good to be safe
}

let animationId;
let isGameOver = false;

function gameOver() {
    isGameOver = true;
    stopTimer();
    playSound('gameover');
    if (animationId) cancelAnimationFrame(animationId);
    document.getElementById('game-over').classList.remove('hidden');

    // Clear held piece on game over
    holdPiece = null;
    drawHold();
}

function resetGame() {
    isGameOver = false;
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.lines = 0;
    updateScore();
    updateLines();
    document.getElementById('game-over').classList.add('hidden');
    playerReset(); // Reset piece again to be safe
    update();
    startTimer();
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

let dropCounter = 0;
let dropInterval = 1000;

let lastTime = 0;
function update(time = 0) {
    if (isGameOver) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    if (!isSweeping) {
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
        }
    }

    draw();
    animationId = requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById('score').innerText = player.score;
}

const arena = createMatrix(12, 20);

const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    score: 0,
    lines: 0,
};



// Audio System
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const gainNode = audioCtx.createGain();
gainNode.gain.value = 0.5; // Master volume (Increased)
gainNode.connect(audioCtx.destination);

// Auto-play logic
let isMuted = false; // Default to unmuted per request

function tryStartAudio() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            console.log("AudioContext resumed successfully");
        }).catch(e => console.error(e));
    }
}

// Global listener to ensure audio starts on first interaction if blocked
['click', 'keydown'].forEach(event => {
    document.addEventListener(event, () => {
        tryStartAudio();
    }, { once: false }); // Keep trying or just once? Once is usually enough but state might toggle.
});
// Actually, let's just make it persistent but check state.

// Sound Effects
function playSound(type) {
    if (isMuted) return;
    if (audioCtx.state === 'suspended') tryStartAudio();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination); // Bypass master gain for SFX to be clearer or use master

    const now = audioCtx.currentTime;

    if (type === 'move') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'rotate') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'drop') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    } else if (type === 'clear') {
        // Cooler clear sound: Swipe up with noise
        osc.type = 'triangle'; // Cleaner base
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.2);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.start(now);
        osc.stop(now + 0.3);

        // Add a secondary sparkly noise layer
        const noiseOsc = audioCtx.createOscillator();
        const noiseGain = audioCtx.createGain();
        noiseOsc.type = 'sawtooth';
        noiseOsc.frequency.setValueAtTime(800, now);
        noiseOsc.frequency.exponentialRampToValueAtTime(2000, now + 0.1);

        noiseOsc.connect(noiseGain);
        noiseGain.connect(gainNode);

        noiseGain.gain.setValueAtTime(0.05, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        noiseOsc.start(now);
        noiseOsc.stop(now + 0.15);
    } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 1.0);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 1.0);

        osc.start(now);
        osc.stop(now + 1.0);
    }
}

// Simple sequencer for Tetris Theme (Korobeiniki)
let themeInterval = null;
let noteIndex = 0;
// Simplified melody: Note (Hz), Duration (beats)
// A4=440
// E5-B4-C5-D5-C5-B4-A4-A4-C5-E5-D5-C5-B4-C5-D5-E5-C5-A4-A4
// Tempo roughly 150 BPM
const melody = [
    {f: 659.25, d: 4}, // E5
    {f: 493.88, d: 2}, // B4
    {f: 523.25, d: 2}, // C5
    {f: 587.33, d: 4}, // D5
    {f: 523.25, d: 2}, // C5
    {f: 493.88, d: 2}, // B4
    {f: 440.00, d: 4}, // A4
    {f: 440.00, d: 2}, // A4
    {f: 523.25, d: 2}, // C5
    {f: 659.25, d: 4}, // E5
    {f: 587.33, d: 2}, // D5
    {f: 523.25, d: 2}, // C5
    {f: 493.88, d: 4}, // B4
    {f: 523.25, d: 2}, // C5
    {f: 587.33, d: 4}, // D5
    {f: 659.25, d: 4}, // E5
    {f: 523.25, d: 4}, // C5
    {f: 440.00, d: 4}, // A4
    {f: 440.00, d: 4}, // A4
    {f: 0, d: 4}       // Rest
];

function playTheme() {
    if (themeInterval) clearInterval(themeInterval);
    // noteIndex = 0; // Don't reset index if called repeatedly, but here we might want to.

    let tempo = 150; // BPM

    function playNextNote() {
        if (isMuted) return;
        const note = melody[noteIndex];
        const duration = note.d * (60 / tempo) * 1000 * 0.5; // Scale to taste

        if (note.f > 0) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.value = note.f;
            osc.connect(gain);
            gain.connect(gainNode); // Use master gain

            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration / 1000);

            osc.start();
            osc.stop(audioCtx.currentTime + duration / 1000);
        }

        noteIndex = (noteIndex + 1) % melody.length;
        themeInterval = setTimeout(playNextNote, duration);
    }

    playNextNote();
}

function stopTheme() {
    clearTimeout(themeInterval);
}

// Intro Animation Logic
let hasStarted = false;
let isGameActive = false;

function startSequence() {
    if (hasStarted) return;
    hasStarted = true;

    // Resume Audio Context
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    playTheme();

    const introOverlay = document.getElementById('intro-overlay');
    const introLogo = document.getElementById('intro-logo');
    const startPrompt = document.getElementById('start-prompt');
    const gameTitle = document.getElementById('game-title');

    // 1. Hide Prompt, Show Logo
    startPrompt.style.display = 'none';
    introLogo.classList.remove('hidden');

    // 2. Wait 1.5s (Music playing, Logo visible)
    setTimeout(() => {
        // 3. Transition: Fade out overlay background, fade out logo, fade in title
        introOverlay.style.background = 'transparent';
        introLogo.classList.add('logo-hidden');
        gameTitle.style.transition = 'opacity 1s ease-in-out';
        gameTitle.style.opacity = '1';

        // Reset player and start game loop here so it feels like a fresh start
        isGameActive = true;
        playerReset();
        update();
        startTimer();

        // Remove overlay from DOM interaction after transition
        setTimeout(() => {
            introOverlay.style.display = 'none';
        }, 1000);

    }, 1500);
}

// Wait for user interaction to start the sequence
['click', 'keydown'].forEach(event => {
    document.addEventListener(event, startSequence);
});


document.addEventListener('keydown', event => {
    if (!isGameActive || isSweeping) return;

    if (event.keyCode === 37) {
        playerMove(-1);
        playSound('move');
    } else if (event.keyCode === 39) {
        playerMove(1);
        playSound('move');
    } else if (event.keyCode === 40) {
        playerDrop();
    } else if (event.keyCode === 81) {
        playerRotate(-1);
        playSound('rotate');
    } else if (event.keyCode === 87 || event.keyCode === 38) {
        playerRotate(1);
        playSound('rotate');
    } else if (event.keyCode === 32 || event.keyCode === 13) {
        playerHardDrop();
        playSound('drop');
    } else if (event.keyCode === 16 || event.keyCode === 67) { // Shift or C
        playerHold();
    }
});

playerReset();
updateScore();
// update(); // Don't start update loop immediately, wait for startSequence

// Game Constants
const GRID_SIZE = 8;
const CELL_SIZE = 40; // 320 / 8
const GRID_WIDTH = 320;
const GRID_HEIGHT = 320;

// Colors
const COLORS = [
    '#FF0D0D', // Red
    '#FFE138', // Yellow
    '#0DFF72', // Green
    '#FF8E0D', // Orange
    '#F538FF', // Purple
    '#0DC2FF', // Cyan
    '#3877FF', // Blue
    '#FF5722', // Deep Orange
];

const BG_COLOR = '#1a1a20';
const EMPTY_CELL_COLOR = '#26262f';

// Shapes Definition
// Represented as arrays of [row, col] coordinates relative to top-left (0,0)
const SHAPES = [
    // Single
    { coords: [[0, 0]], color: 0 },
    // 2-line
    { coords: [[0, 0], [0, 1]], color: 1 }, // H
    { coords: [[0, 0], [1, 0]], color: 1 }, // V
    // 3-line
    { coords: [[0, 0], [0, 1], [0, 2]], color: 2 }, // H
    { coords: [[0, 0], [1, 0], [2, 0]], color: 2 }, // V
    // 4-line
    { coords: [[0, 0], [0, 1], [0, 2], [0, 3]], color: 3 }, // H
    { coords: [[0, 0], [1, 0], [2, 0], [3, 0]], color: 3 }, // V
    // 5-line
    { coords: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], color: 4 }, // H
    { coords: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], color: 4 }, // V
    // Square 2x2
    { coords: [[0, 0], [0, 1], [1, 0], [1, 1]], color: 5 },
    // Square 3x3
    { coords: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], color: 6 },
    // L-shapes (Small 2x2 bounding box)
    { coords: [[0, 0], [1, 0], [1, 1]], color: 7 }, // L bottom-right
    { coords: [[0, 1], [1, 0], [1, 1]], color: 7 }, // L bottom-left (flipped)
    { coords: [[0, 0], [0, 1], [1, 0]], color: 7 }, // L top-left
    { coords: [[0, 0], [0, 1], [1, 1]], color: 7 }, // L top-right
    // T-shapes
    { coords: [[0, 1], [1, 0], [1, 1], [1, 2]], color: 5 }, // T up
    { coords: [[0, 0], [0, 1], [0, 2], [1, 1]], color: 5 }, // T down
    // Z-shapes / S-shapes (3x2)
    { coords: [[0, 0], [0, 1], [1, 1], [1, 2]], color: 4 },
    { coords: [[0, 1], [0, 2], [1, 0], [1, 1]], color: 4 }
];

// Game State
let grid = []; // 8x8 array
let score = 0;
let bestScore = localStorage.getItem('blockBlastBestScore') || 0;
let trayBlocks = [null, null, null]; // The 3 current blocks
let draggingBlock = null; // { index: 0-2, shape: {}, offsetX: 0, offsetY: 0, startX: 0, startY: 0 }
let mousePos = { x: 0, y: 0 };

// DOM Elements
const canvas = document.getElementById('game-grid');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const trayCanvases = [
    document.getElementById('tray-1'),
    document.getElementById('tray-2'),
    document.getElementById('tray-3')
];
const trayCtxs = trayCanvases.map(c => c.getContext('2d'));
const gameOverOverlay = document.getElementById('game-over-overlay');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// Initialization
function init() {
    // Init Grid
    grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    score = 0;
    updateScoreUI();
    bestScoreEl.innerText = bestScore;
    gameOverOverlay.classList.add('hidden');

    // Generate initial blocks
    spawnBlocks();

    // Start Loop
    requestAnimationFrame(gameLoop);
}

function updateScoreUI() {
    scoreEl.innerText = score;
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('blockBlastBestScore', bestScore);
        bestScoreEl.innerText = bestScore;
    }
}

function spawnBlocks() {
    for (let i = 0; i < 3; i++) {
        const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        // Deep copy coords to avoid modifying reference if we implemented rotation later (not needed now but good practice)
        trayBlocks[i] = {
            coords: JSON.parse(JSON.stringify(randomShape.coords)),
            color: COLORS[randomShape.color % COLORS.length],
            id: i
        };
    }
    drawTray();
    checkGameOver();
}

function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
    }
    if (strokeStyle) {
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
    }
}

function drawBlock(ctx, shape, offsetX, offsetY, scale = 1, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const size = CELL_SIZE - 2; // Margin

    shape.coords.forEach(coord => {
        const x = coord[1] * CELL_SIZE + 1;
        const y = coord[0] * CELL_SIZE + 1;

        // Draw main block
        drawRoundedRect(ctx, x, y, size, size, 8, shape.color);

        // Inner highlight/bevel
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(x + 10, y + 10, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
}

function drawTray() {
    trayCtxs.forEach((ctx, i) => {
        ctx.clearRect(0, 0, 100, 100);
        const block = trayBlocks[i];
        if (block) {
            // Center the block in the 100x100 canvas
            // Calculate bounds
            let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
            block.coords.forEach(([r, c]) => {
                minR = Math.min(minR, r);
                maxR = Math.max(maxR, r);
                minC = Math.min(minC, c);
                maxC = Math.max(maxC, c);
            });

            const blockW = (maxC - minC + 1) * CELL_SIZE;
            const blockH = (maxR - minR + 1) * CELL_SIZE;

            // Calculate scale to fit if too big
            let scale = 1;
            if (blockW > 90 || blockH > 90) {
                scale = Math.min(90 / blockW, 90 / blockH);
            }

            // Re-calc centered position
            const drawW = blockW * scale;
            const drawH = blockH * scale;

            const offsetX = (100 - drawW) / 2 - (minC * CELL_SIZE * scale);
            const offsetY = (100 - drawH) / 2 - (minR * CELL_SIZE * scale);

            // Don't draw if dragging this specific block (unless we want a ghost in tray? usually no)
            if (draggingBlock && draggingBlock.index === i) {
                 ctx.globalAlpha = 0.3; // Show faint ghost in tray
            } else {
                 ctx.globalAlpha = 1;
            }

            drawBlock(ctx, block, offsetX, offsetY, scale);
        }
    });
}

function drawGrid() {
    // Clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, GRID_WIDTH, GRID_HEIGHT);

    // Draw cells
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const x = c * CELL_SIZE;
            const y = r * CELL_SIZE;

            const val = grid[r][c];

            // Background slot
            drawRoundedRect(ctx, x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6, EMPTY_CELL_COLOR);

            if (val !== 0) {
                 // Filled block
                 drawRoundedRect(ctx, x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 8, val);
                 // Highlight
                 ctx.fillStyle = 'rgba(255,255,255,0.3)';
                 ctx.beginPath();
                 ctx.arc(x + 10, y + 10, 4, 0, Math.PI * 2);
                 ctx.fill();
            }
        }
    }
}

function getGridPosFromMouse(mx, my) {
    const rect = canvas.getBoundingClientRect();
    const x = mx - rect.left;
    const y = my - rect.top;

    // Check if within bounds
    if (x >= 0 && x <= GRID_WIDTH && y >= 0 && y <= GRID_HEIGHT) {
        return {
            c: Math.floor(x / CELL_SIZE),
            r: Math.floor(y / CELL_SIZE),
            rawX: x,
            rawY: y
        };
    }
    return null;
}

// Logic to check if block fits at specific grid row/col
function canPlace(block, gridR, gridC) {
    // We align the top-left (0,0) of the block definition to gridR, gridC
    // Actually, dragging logic is usually: mouse is over a specific cell. Which cell of the block is the mouse over?
    // Simplified: Mouse holds the center or top-left of the block.
    // Better UX: Snap the block so that the cell under the mouse corresponds to the closest cell in the block shape.
    // Let's assume the user grabs the block "generally". We map the top-left of the block to the grid cell.
    // However, for drag-drop, we usually calculate an offset.

    // With `draggingBlock`, we have `dragOffset`.
    // Let's calculate the target top-left grid cell based on mouse position.

    // But let's simplify: Use the visual top-left of the block.
    // If draggingBlock is at screen (X,Y), and grid is at (GX, GY).
    // The block's (0,0) cell is at (X, Y).
    // The nearest grid cell to (X,Y) is the target (TR, TC).

    for (const [r, c] of block.coords) {
        const tr = gridR + r;
        const tc = gridC + c;

        if (tr < 0 || tr >= GRID_SIZE || tc < 0 || tc >= GRID_SIZE) return false;
        if (grid[tr][tc] !== 0) return false;
    }
    return true;
}

function gameLoop() {
    drawGrid();

    // Draw Dragging Block
    if (draggingBlock) {
        // Highlight Drop Position?
        const rect = canvas.getBoundingClientRect();
        // Calculate where the top-left of the block is relative to the canvas
        // Mouse is at mousePos.x, mousePos.y (client coords)
        // Drag Offset is difference between Mouse and Top-Left of block canvas originally.
        // We want to align nicely.

        // Let's calculate the projected grid position.
        // The block's (0,0) coord is at: mousePos.x + draggingBlock.visualOffsetX
        // visualOffsetX needs to be determined at start of drag.

        const blockX = mousePos.x + draggingBlock.visualOffsetX;
        const blockY = mousePos.y + draggingBlock.visualOffsetY;

        // Convert to canvas relative
        const relX = blockX - rect.left;
        const relY = blockY - rect.top;

        // Calculate Grid Col/Row for the top-left (0,0) of the block
        // We add CELL_SIZE/2 to snap to nearest center
        const targetC = Math.round(relX / CELL_SIZE);
        const targetR = Math.round(relY / CELL_SIZE);

        // Store for drop logic
        draggingBlock.targetR = targetR;
        draggingBlock.targetC = targetC;

        // Check validity
        if (canPlace(draggingBlock.block, targetR, targetC)) {
            // Draw Ghost/Shadow
            ctx.save();
            ctx.globalAlpha = 0.3;
            draggingBlock.block.coords.forEach(([r, c]) => {
                const x = (targetC + c) * CELL_SIZE;
                const y = (targetR + r) * CELL_SIZE;
                drawRoundedRect(ctx, x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 8, draggingBlock.block.color);
            });
            ctx.restore();
        }

        // Draw the actual block floating
        // We draw it in a separate overlay or just on top of canvas?
        // If it's outside canvas, canvas won't show it.
        // So we need a global overlay or we rely on the fact that the user is hovering the grid.
        // If the user drags outside the grid, we want to see it.
        // Solution: Use a separate floating canvas or div for the drag representative.
        // HTML5 DnD is clunky for this.
        // Simplest: Just use a fixed position DIV that follows mouse, containing a canvas with the block.

        // I will update the helper element position
        const helper = document.getElementById('drag-helper');
        if (helper) {
            helper.style.transform = `translate(${mousePos.x}px, ${mousePos.y}px)`;
            helper.style.display = 'block';
        }
    }

    requestAnimationFrame(gameLoop);
}

// Input Handling
function handleStart(e, index) {
    e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    const block = trayBlocks[index];
    if (!block) return;

    // Calculate visual offset so the block doesn't snap its top-left to mouse
    // We want the mouse to grab the block where it clicked.
    // Tray canvas is 100x100.
    const rect = trayCanvases[index].getBoundingClientRect();
    const clickX = touch.clientX - rect.left;
    const clickY = touch.clientY - rect.top;

    // Find block bounds again to know where it is drawn in the tray
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    block.coords.forEach(([r, c]) => {
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
    });
    const blockW = (maxC - minC + 1) * CELL_SIZE;
    const blockH = (maxR - minR + 1) * CELL_SIZE;
    let scale = 1;
    if (blockW > 90 || blockH > 90) scale = Math.min(90 / blockW, 90 / blockH);

    const drawW = blockW * scale;
    const drawH = blockH * scale;
    const offsetX = (100 - drawW) / 2 - (minC * CELL_SIZE * scale);
    const offsetY = (100 - drawH) / 2 - (minR * CELL_SIZE * scale);

    // The drawn block (0,0) is at (offsetX, offsetY) inside the tray canvas.
    // And scaled by `scale`.
    // We want to render the dragged block at 1.0 scale (actual size).
    // So we need to position the helper such that the mouse is relative to the block anchor similarly.

    // If I clicked at (cx, cy) in tray.
    // The relative pos to block origin (scaled) is (cx - offsetX, cy - offsetY).
    // In unscaled units: (cx - offsetX)/scale.

    // So the visual offset for the dragging block (1.0 scale) should be:
    // -1 * (cx - offsetX) / scale

    const visualOffsetX = -1 * (clickX - offsetX) / scale;
    const visualOffsetY = -1 * (clickY - offsetY) / scale;

    draggingBlock = {
        index: index,
        block: block,
        visualOffsetX: visualOffsetX,
        visualOffsetY: visualOffsetY
    };

    // Create/Update Drag Helper
    let helper = document.getElementById('drag-helper');
    if (!helper) {
        helper = document.createElement('canvas');
        helper.id = 'drag-helper';
        helper.style.position = 'fixed';
        helper.style.pointerEvents = 'none';
        helper.style.zIndex = '9999';
        helper.style.top = '0';
        helper.style.left = '0';
        document.body.appendChild(helper);
    }

    // Helper size should be bounding box of block at scale 1
    // But simplest is to make it big enough
    const size = 5 * CELL_SIZE;
    helper.width = size;
    helper.height = size;
    const hCtx = helper.getContext('2d');
    hCtx.clearRect(0, 0, size, size);

    // Draw block at (0,0) + offset? No, we transform the DIV.
    // The DIV is at mouse position.
    // Inside the DIV, we want the block to be offset by visualOffsetX.
    // So if visualOffsetX is -20, we draw at -20? No canvas cuts off.

    // Better strategy:
    // Place DIV at (0,0). Transform translate(mousePos.x, mousePos.y).
    // Inside Canvas, draw block at (visualOffsetX, visualOffsetY).
    // Note: visualOffsetX is negative usually.
    // We center the "grab point" in the helper canvas?

    // Let's make helper canvas centered on mouse.
    helper.style.marginLeft = `${visualOffsetX}px`;
    helper.style.marginTop = `${visualOffsetY}px`;

    drawBlock(hCtx, block, 0, 0, 1, 0.9);

    mousePos.x = touch.clientX;
    mousePos.y = touch.clientY;

    drawTray(); // Update tray (ghost)
}

function handleMove(e) {
    if (!draggingBlock) return;
    e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    mousePos.x = touch.clientX;
    mousePos.y = touch.clientY;
}

function handleEnd(e) {
    if (!draggingBlock) return;
    e.preventDefault();

    const { block, targetR, targetC, index } = draggingBlock;

    if (targetR !== undefined && canPlace(block, targetR, targetC)) {
        placeBlock(block, targetR, targetC);
        trayBlocks[index] = null;

        // Check refill
        if (trayBlocks.every(b => b === null)) {
            spawnBlocks();
        } else {
            // Check game over only if not refilling (refill checks it)
            checkGameOver();
        }
    } else {
        // Failed drop - sound? animation?
    }

    draggingBlock = null;
    const helper = document.getElementById('drag-helper');
    if (helper) helper.remove();

    drawTray();
    drawGrid(); // Clear shadows
}

function placeBlock(block, r, c) {
    // Place
    block.coords.forEach(([br, bc]) => {
        grid[r + br][c + bc] = block.color;
    });

    score += block.coords.length;

    // Check Lines
    checkLines();
    updateScoreUI();
}

function checkLines() {
    let linesCleared = 0;
    const rowsToClear = [];
    const colsToClear = [];

    // Check Rows
    for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r].every(cell => cell !== 0)) {
            rowsToClear.push(r);
        }
    }

    // Check Cols
    for (let c = 0; c < GRID_SIZE; c++) {
        let full = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            if (grid[r][c] === 0) {
                full = false;
                break;
            }
        }
        if (full) colsToClear.push(c);
    }

    if (rowsToClear.length > 0 || colsToClear.length > 0) {
        // Clear
        // For simplicity immediately. Optional: animation.

        rowsToClear.forEach(r => {
            for (let c = 0; c < GRID_SIZE; c++) grid[r][c] = 0;
        });

        colsToClear.forEach(c => {
            for (let r = 0; r < GRID_SIZE; r++) grid[r][c] = 0;
        });

        // Bonus for multiple lines
        const totalLines = rowsToClear.length + colsToClear.length;
        // Formula: 10 points per line, plus bonus?
        // Basic: 10 * lines * lines?
        score += totalLines * 10 * totalLines;
    }
}

function checkGameOver() {
    // For each available block in tray, check if it can fit ANYWHERE
    let possible = false;

    // If tray is empty, it's not game over (it refills).
    // But we call this after refill or after drop.

    // If all are null, we don't check (refill happens).
    const activeBlocks = trayBlocks.filter(b => b !== null);
    if (activeBlocks.length === 0) return; // Should have refilled

    for (const block of activeBlocks) {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (canPlace(block, r, c)) {
                    possible = true;
                    break;
                }
            }
            if (possible) break;
        }
        if (possible) break;
    }

    if (!possible) {
        gameOver();
    }
}

function gameOver() {
    finalScoreEl.innerText = score;
    gameOverOverlay.classList.remove('hidden');
    trayBlocks = [null, null, null]; // Disable interaction
}

// Event Listeners
trayCanvases.forEach((c, i) => {
    c.addEventListener('mousedown', (e) => handleStart(e, i));
    c.addEventListener('touchstart', (e) => handleStart(e, i), { passive: false });
});

window.addEventListener('mousemove', handleMove);
window.addEventListener('touchmove', handleMove, { passive: false });

window.addEventListener('mouseup', handleEnd);
window.addEventListener('touchend', handleEnd);

restartBtn.addEventListener('click', init);

// Start
init();

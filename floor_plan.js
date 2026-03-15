document.addEventListener('DOMContentLoaded', () => {
    const GRID_SIZE = 32;
    const gridContainer = document.getElementById('grid-container');
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const statusText = document.getElementById('status-text');
    const statusDot = document.querySelector('.status-dot');
    const terrainBtns = document.querySelectorAll('.terrain-btn');

    // WFC Rules Setup (Simplified for floor/wall/outside)
    const TYPES = ['floor', 'wall', 'empty'];

    // Weights dictate how often each tile is chosen in unconstrained space
    let WEIGHTS = {
        floor: 60,
        wall: 30,
        empty: 5
    };

    // Symmetrical Adjacency Rules
    const RULES = {
        'floor': ['floor', 'wall'],
        'wall': ['floor', 'wall', 'empty'],
        'empty': ['empty', 'wall']
    };

    let grid = [];
    let isGenerating = false;
    let selectedTerrain = 'floor';
    let isDrawing = false;
    let roomMask = []; // Boolean grid: true = room/corridor area

    // Select terrain type from palette
    terrainBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (isGenerating) return;
            terrainBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedTerrain = btn.dataset.type;
        });
    });

    // Initialize Grid
    function initGrid() {
        gridContainer.innerHTML = '';
        grid = [];
        roomMask = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));

        for (let y = 0; y < GRID_SIZE; y++) {
            let row = [];
            for (let x = 0; x < GRID_SIZE; x++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.dataset.x = x;
                tile.dataset.y = y;

                // Allow drawing
                tile.addEventListener('mousedown', () => startDrawing(x, y));
                tile.addEventListener('mouseenter', () => continueDrawing(x, y));

                gridContainer.appendChild(tile);

                row.push({
                    x, y,
                    element: tile,
                    options: [...TYPES], // Initial entropy is maximum
                    collapsed: false,
                    type: null
                });
            }
            grid.push(row);
        }

        document.body.addEventListener('mouseup', () => { isDrawing = false; });
        updateStatus('Ready - Draw initial tiles or click Generate', false);
    }

    function startDrawing(x, y) {
        if (isGenerating) return;
        isDrawing = true;
        setTile(x, y, selectedTerrain);
    }

    function continueDrawing(x, y) {
        if (isGenerating || !isDrawing) return;
        setTile(x, y, selectedTerrain);
    }

    function setTile(x, y, type) {
        const cell = grid[y][x];

        if (type === 'erase') {
            cell.element.className = 'tile';
            cell.collapsed = false;
            cell.type = null;
            cell.options = [...TYPES];
        } else {
            cell.element.className = `tile ${type}`;
            cell.collapsed = true;
            cell.type = type;
            cell.options = [type];
        }
    }

    function updateStatus(text, processing = false) {
        statusText.textContent = text;
        if (processing) {
            statusDot.classList.add('processing');
        } else {
            statusDot.classList.remove('processing');
        }
    }

    // --- MACRO GENERATION (ORGANIC ROOM MASKS) ---
    function generateRoomMask() {
        roomMask = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
        
        // 1. Maximize Bounding Box: Seed focal points near the corners and center.
        const focalPoints = [];
        const padding = 6;
        focalPoints.push({ x: GRID_SIZE / 2, y: GRID_SIZE / 2 }); // Center
        focalPoints.push({ x: padding + Math.random() * 4, y: padding + Math.random() * 4 }); // TL
        focalPoints.push({ x: GRID_SIZE - padding - Math.random() * 4, y: padding + Math.random() * 4 }); // TR
        focalPoints.push({ x: padding + Math.random() * 4, y: GRID_SIZE - padding - Math.random() * 4 }); // BL
        focalPoints.push({ x: GRID_SIZE - padding - Math.random() * 4, y: GRID_SIZE - padding - Math.random() * 4 }); // BR

        // 2. Organic Lobe Splatting: Draw intersecting circles around focal points
        for (const fp of focalPoints) {
            const numSplats = Math.floor(Math.random() * 3) + 2; // 2 to 4 splats per focal point
            for (let i = 0; i < numSplats; i++) {
                const offsetX = (Math.random() - 0.5) * 6;
                const offsetY = (Math.random() - 0.5) * 6;
                const cx = fp.x + offsetX;
                const cy = fp.y + offsetY;
                const radius = Math.random() * 2.0 + 1.2; // Radius 1.2 to 3.2

                drawThickCircle(cx, cy, radius);
            }
        }

        // 3. Thick Corridor Bridging (Minimum Spanning Tree)
        const edges = [];
        for (let i = 0; i < focalPoints.length; i++) {
            for (let j = i + 1; j < focalPoints.length; j++) {
                const dx = focalPoints[i].x - focalPoints[j].x;
                const dy = focalPoints[i].y - focalPoints[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                edges.push({ u: i, v: j, weight: dist });
            }
        }
        
        // Sort edges by distance
        edges.sort((a, b) => a.weight - b.weight);

        // Kruskal's MST
        const parent = Array(focalPoints.length).fill(-1);
        function find(i) {
            if (parent[i] == -1) return i;
            return parent[i] = find(parent[i]);
        }
        function union(i, j) {
            const rootI = find(i);
            const rootJ = find(j);
            if (rootI !== rootJ) {
                parent[rootI] = rootJ;
                return true;
            }
            return false;
        }

        const mstEdges = [];
        for (const edge of edges) {
            if (union(edge.u, edge.v)) {
                mstEdges.push(edge);
            }
        }

        // Draw thick organic corridors between MST focal nodes
        for (const edge of mstEdges) {
            const u = focalPoints[edge.u];
            const v = focalPoints[edge.v];
            drawThickLine(u.x, u.y, v.x, v.y, Math.random() * 0.8 + 1.2); // Thickness 1.2 - 2.0
        }
    }

    function drawThickCircle(cx, cy, radius) {
        const r2 = radius * radius;
        for (let y = 2; y < GRID_SIZE - 2; y++) {
            for (let x = 2; x < GRID_SIZE - 2; x++) {
                const dx = x - cx;
                const dy = y - cy;
                if (dx * dx + dy * dy <= r2) {
                    roomMask[y][x] = true;
                }
            }
        }
    }

    function drawThickLine(x0, y0, x1, y1, radius) {
        const dist = Math.sqrt((x1-x0)*(x1-x0) + (y1-y0)*(y1-y0));
        const steps = Math.ceil(dist * 2); // Dense interpolation
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const cx = x0 + (x1 - x0) * t;
            const cy = y0 + (y1 - y0) * t;
            drawThickCircle(cx, cy, radius);
        }
    }

    // --- WFC GENERATOR ---

    generateBtn.addEventListener('click', () => {
        if (isGenerating) return;
        generate();
    });

    clearBtn.addEventListener('click', () => {
        if (isGenerating) return;
        initGrid();
    });

    async function generate() {
        isGenerating = true;

        WEIGHTS.floor = parseInt(document.getElementById('weight-floor').value) || 60;
        WEIGHTS.wall = parseInt(document.getElementById('weight-wall').value) || 30;
        WEIGHTS.empty = parseInt(document.getElementById('weight-empty').value) || 5;

        updateStatus('Planning Layout (Macro Phase)...', true);
        generateBtn.disabled = true;
        clearBtn.disabled = true;

        generateRoomMask();

        // Reset Entropies and Apply Mask Constraints
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                if (!grid[y][x].collapsed) {
                    // Restrict entropy purely based on the macro map
                    if (roomMask[y][x]) {
                        // Inside the room mask: must be floor
                        grid[y][x].options = ['floor'];
                    } else {
                        // Outside the mask: check if it borders the room to allow walls, otherwise hard-code to empty
                        let bordersRoom = false;
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dy === 0 && dx === 0) continue;
                                const ny = y + dy;
                                const nx = x + dx;
                                if (ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE) {
                                    if (roomMask[ny][nx]) bordersRoom = true;
                                }
                            }
                        }
                        if (bordersRoom) {
                            grid[y][x].options = ['empty', 'wall'];
                        } else {
                            grid[y][x].options = ['empty'];
                        }
                    }
                    grid[y][x].element.className = 'tile';
                }
            }
        }

        updateStatus('Propagating constraints...', true);

        // Initial constraint propagation from any pre-set tiles or mask edges
        let queue = [];
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {

                // CRUCIAL FIX for floating walls:
                // If a non-mask cell is NOT adjacent to ANY mask cell, force it to 'empty'.
                // This ensures walls ONLY spawn tightly wrapped around rooms, and everything else is empty.
                if (!roomMask[y][x]) {
                    let bordersRoom = false;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dy === 0 && dx === 0) continue;
                            const ny = y + dy;
                            const nx = x + dx;
                            if (ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE) {
                                if (roomMask[ny][nx]) {
                                    bordersRoom = true;
                                }
                            }
                        }
                    }
                    if (!bordersRoom && !grid[y][x].collapsed) {
                        grid[y][x].options = ['empty'];
                    }
                }

                if (grid[y][x].collapsed || grid[y][x].options.length < TYPES.length) {
                    queue.push(grid[y][x]);
                }

                // Explictly handle absolute grid edges mapping to walls/empty
                if (x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1) {
                    if (!roomMask[y][x] && !grid[y][x].collapsed) {
                        grid[y][x].options = ['empty']; // Force edge to empty if not carved
                        queue.push(grid[y][x]);
                    }
                }
            }
        }

        propagate(queue);

        updateStatus('Collapsing wave function...', true);

        // Main Loop
        while (true) {
            const cell = getMinEntropyCell();

            if (!cell) break; // Done

            collapse(cell);

            cell.element.className = `tile ${cell.type}`;
            await new Promise(r => setTimeout(r, 0)); // yield

            propagate([cell]);
        }

        updateStatus('Generation Complete', false);
        isGenerating = false;
        generateBtn.disabled = false;
        clearBtn.disabled = false;
    }

    function getMinEntropyCell() {
        const strategy = document.getElementById('strategy-select').value;
        let minEntropyOptions = [];
        let minEntropy = Infinity;

        let frontier = [];
        let hasUncollapsed = false;

        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const cell = grid[y][x];
                if (!cell.collapsed) {
                    hasUncollapsed = true;
                    const neighbors = getNeighbors(x, y);
                    if (neighbors.some(n => n.collapsed)) {
                        frontier.push(cell);
                    }
                }
            }
        }

        if (!hasUncollapsed) return null;

        if (strategy === 'bfs' && frontier.length > 0) {
            // Find lowest entropy within frontier to maintain WFC rules while "bubbling"
            for (const cell of frontier) {
                const entropy = cell.options.length;
                if (entropy === 0) { cell.options = ['floor']; return cell; }
                if (entropy < minEntropy) {
                    minEntropy = entropy;
                    minEntropyOptions = [cell];
                } else if (entropy === minEntropy) {
                    minEntropyOptions.push(cell);
                }
            }
            return minEntropyOptions[Math.floor(Math.random() * minEntropyOptions.length)];
        }

        let candidates = frontier.length > 0 ? frontier : [];

        if (candidates.length === 0) {
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                    if (!grid[y][x].collapsed) candidates.push(grid[y][x]);
                }
            }
        }

        for (const cell of candidates) {
            const entropy = cell.options.length;
            if (entropy === 0) {
                cell.options = ['floor'];
                return cell;
            }

            if (entropy < minEntropy) {
                minEntropy = entropy;
                minEntropyOptions = [cell];
            } else if (entropy === minEntropy) {
                minEntropyOptions.push(cell);
            }
        }

        return minEntropyOptions[Math.floor(Math.random() * minEntropyOptions.length)];
    }

    function collapse(cell) {
        const options = cell.options;
        let totalWeight = 0;

        for (const opt of options) {
            totalWeight += WEIGHTS[opt];
        }

        let randomVal = Math.random() * totalWeight;
        let selectedType = options[options.length - 1];

        for (const opt of options) {
            randomVal -= WEIGHTS[opt];
            if (randomVal <= 0) {
                selectedType = opt;
                break;
            }
        }

        cell.type = selectedType;
        cell.options = [selectedType];
        cell.collapsed = true;
    }

    function propagate(queue) {
        const strategy = document.getElementById('strategy-select').value;

        while (queue.length > 0) {
            const cell = strategy === 'dfs' ? queue.pop() : queue.shift();
            const neighbors = getNeighbors(cell.x, cell.y);

            for (const neighbor of neighbors) {
                if (neighbor.collapsed) continue;

                const possibleNeighborTypes = new Set();
                for (const option of cell.options) {
                    RULES[option].forEach(r => possibleNeighborTypes.add(r));
                }

                const newOptions = [];
                for (const nOpt of neighbor.options) {
                    if (possibleNeighborTypes.has(nOpt)) {
                        newOptions.push(nOpt);
                    }
                }

                if (newOptions.length < neighbor.options.length) {
                    neighbor.options = newOptions;
                    queue.push(neighbor);
                }
            }
        }
    }

    function getNeighbors(x, y) {
        const neighbors = [];
        if (y > 0) neighbors.push(grid[y - 1][x]);
        if (y < GRID_SIZE - 1) neighbors.push(grid[y + 1][x]);
        if (x > 0) neighbors.push(grid[y][x - 1]);
        if (x < GRID_SIZE - 1) neighbors.push(grid[y][x + 1]);
        return neighbors;
    }

    // RUN 
    initGrid();
});

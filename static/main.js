document.addEventListener('DOMContentLoaded', () => {
    const GRID_SIZE = 32;
    const gridContainer = document.getElementById('grid-container');
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const statusText = document.getElementById('status-text');
    const statusDot = document.querySelector('.status-dot');
    const terrainBtns = document.querySelectorAll('.terrain-btn');
    
    // WFC Rules Setup
    const TYPES = ['water', 'sand', 'grass', 'mountain'];
    
    // Weights dictate how often each tile is chosen.
    // Start with defaults, but will read from UI dynamically.
    let WEIGHTS = {
        water: parseInt(document.getElementById('weight-water').value) || 50,
        sand: parseInt(document.getElementById('weight-sand').value) || 10,
        grass: parseInt(document.getElementById('weight-grass').value) || 20,
        mountain: parseInt(document.getElementById('weight-mountain').value) || 2
    };

    // Which tiles are allowed adjacent to each tile
    const RULES = {
        water: ['water', 'sand'],
        sand: ['water', 'sand', 'grass'],
        grass: ['sand', 'grass', 'mountain'],
        mountain: ['grass', 'mountain']
    };

    let grid = [];
    let isGenerating = false;
    let selectedTerrain = 'water';
    let isDrawing = false;
    
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

    // Generator ----------------------------------------------
    
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
        
        // Update weights from UI before generating
        WEIGHTS = {
            water: parseInt(document.getElementById('weight-water').value) || 1,
            sand: parseInt(document.getElementById('weight-sand').value) || 1,
            grass: parseInt(document.getElementById('weight-grass').value) || 1,
            mountain: parseInt(document.getElementById('weight-mountain').value) || 1
        };

        updateStatus('Propagating initial constraints...', true);
        generateBtn.disabled = true;
        clearBtn.disabled = true;
        
        // 1. Fully reset entropies of uncollapsed cells just in case
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                if (!grid[y][x].collapsed) {
                    grid[y][x].options = [...TYPES];
                    grid[y][x].element.className = 'tile';
                }
            }
        }
        
        // 2. Initial constraint propagation from any pre-set tiles
        let queue = [];
        let hasCollapsed = false;
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                if (grid[y][x].collapsed) {
                    queue.push(grid[y][x]);
                    hasCollapsed = true;
                }
            }
        }
        
        // If nothing is collapsed, seed the center
        if (!hasCollapsed) {
            const centerX = Math.floor(GRID_SIZE / 2);
            const centerY = Math.floor(GRID_SIZE / 2);
            // Don't just set options, actually collapse it so it renders and propagates
            grid[centerY][centerX].options = ['water']; 
            grid[centerY][centerX].type = 'water';
            grid[centerY][centerX].collapsed = true;
            grid[centerY][centerX].element.className = 'tile water';
            queue.push(grid[centerY][centerX]);
        }
        
        propagate(queue);
        
        updateStatus('Collapsing wave function...', true);
        
        // 3. Main Loop
        while(true) {
            const cell = getMinEntropyCell();
            
            if (!cell) {
                // Done!
                break;
            }
            
            // Collapse
            collapse(cell);
            
            // Render frame incrementally for cool effect
            cell.element.className = `tile ${cell.type}`;
            await new Promise(r => setTimeout(r, 0)); // yield to UI thread
            
            // Propagate
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
        
        let candidates = [];
        
        // Find the "frontier": uncollapsed cells that are adjacent to collapsed cells
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
        
        if (!hasUncollapsed) return null; // All done completely!

        // For BFS, we literally just pick randomly from the frontier to grow evenly everywhere.
        // We ignore the actual min-entropy rule to force a perfect "bubble" shape. 
        if (strategy === 'bfs' && frontier.length > 0) {
            return frontier[Math.floor(Math.random() * frontier.length)];
        }
        
        // For DFS, or if the frontier is empty (should only happen at start/errors), 
        // we use standard WFC min-entropy heuristic over all valid candidates.
        candidates = frontier.length > 0 ? frontier : []; 

        if (candidates.length === 0) {
            // Fallback: all uncollapsed cells
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                    if (!grid[y][x].collapsed) candidates.push(grid[y][x]);
                }
            }
        }

        for (const cell of candidates) {
            const entropy = cell.options.length;
            if (entropy === 0) {
                // Contradiction occurred!
                cell.options = ['water'];
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
        // Pick one option based on weights
        const options = cell.options;
        let totalWeight = 0;
        
        for (const opt of options) {
            totalWeight += Math.pow(WEIGHTS[opt], 2); // Exaggerate weight differences for better clustering
        }
        
        let randomVal = Math.random() * totalWeight;
        let selectedType = options[options.length - 1]; // default fallback
        
        for (const opt of options) {
            randomVal -= Math.pow(WEIGHTS[opt], 2);
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
        
        while(queue.length > 0) {
            // BFS uses shift (queue), DFS uses pop (stack)
            const cell = strategy === 'dfs' ? queue.pop() : queue.shift();
            
            const neighbors = getNeighbors(cell.x, cell.y);
            
            for (const neighbor of neighbors) {
                if (neighbor.collapsed) continue;
                
                // What types does current cell allow?
                const possibleNeighborTypes = new Set();
                for (const option of cell.options) {
                    RULES[option].forEach(r => possibleNeighborTypes.add(r));
                }
                
                // Keep only neighbor options that are allowed by at least one of cell's current options
                const newOptions = [];
                for (const nOpt of neighbor.options) {
                    if (possibleNeighborTypes.has(nOpt)) {
                        newOptions.push(nOpt);
                    }
                }
                
                if (newOptions.length < neighbor.options.length) {
                    // Entropy reduced
                    neighbor.options = newOptions;
                    // Add neighbor to queue to propagate further
                    queue.push(neighbor);
                }
            }
        }
    }
    
    function getNeighbors(x, y) {
        const neighbors = [];
        // Standard 4-way neighbors (Von Neumann neighborhood)
        if (y > 0) neighbors.push(grid[y-1][x]);
        if (y < GRID_SIZE - 1) neighbors.push(grid[y+1][x]);
        if (x > 0) neighbors.push(grid[y][x-1]);
        if (x < GRID_SIZE - 1) neighbors.push(grid[y][x+1]);
        return neighbors;
    }

    // RUN 
    initGrid();
});

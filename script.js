// Game constants
const GRID_WIDTH = 20;
const GRID_HEIGHT = 12;
let CELL_SIZE; // This will now be dynamic

// Game elements
const maze = document.getElementById('maze');
const player = document.getElementById('player');
const goal = document.getElementById('goal');
const joystickHandle = document.getElementById('joystick-handle');
const message = document.getElementById('message');
const restartBtn = document.getElementById('restart');
const loveTitle = document.getElementById('love-title');
const subtitle = document.getElementById('subtitle');
const gameArea = document.getElementById('game-area'); // Get gameArea element here

// Game settings
const playerSpeed = 4; // This will now be the MAX speed
let PLAYER_COLLISION_RADIUS; // Will be calculated dynamically
let GOAL_RADIUS; // Will be calculated dynamically
const WALL_THICKNESS = 4; // Used for wall generation

let playerX, playerY;
let goalX, goalY;
let walls = [];
let currentMoveX = 0;
let currentMoveY = 0;

// Joystick state
let isJoystickActive = false;
const joystickCenterX = 60;
const joystickCenterY = 60;
const playerMovementMaxDistance = 40; // Max distance for player's full speed
const movementDeadZone = 10; // Pixels from center before player starts moving
const maxVisualHandleDistance = 70; // Max distance for the visual handle to move

// Maze grid
let grid = [];

// Create the game on load and handle resize
window.onload = function() {
    // Initial setup
    setupGameAreaAndContainer();
    startGame();

    // Listen for resize events to re-adjust CELL_SIZE and re-draw maze if needed
    // Using a debounced resize listener for performance
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            setupGameAreaAndContainer();
            // Re-generate maze and restart game to adapt to new cell size
            startGame();
        }, 200); // Debounce to prevent excessive calls
    });
};

function setupGameAreaAndContainer() {
    // Calculate dynamic CELL_SIZE based on current gameArea width
    CELL_SIZE = Math.floor(gameArea.offsetWidth / GRID_WIDTH); // Ensure integer for pixel perfect walls

    // Adjust game-area height to match grid height
    gameArea.style.height = (GRID_HEIGHT * CELL_SIZE) + 'px';

    const containerWrapper = document.getElementById('container-wrapper');
    // For mobile, the height might be auto with flex-direction column, so only set if not auto
    if (window.innerWidth > 768) { // Only set fixed height on larger screens
        containerWrapper.style.height = (GRID_HEIGHT * CELL_SIZE) + 'px';
    } else {
        containerWrapper.style.height = 'auto'; // Let CSS media query manage height
    }

    // Adjust collision radii based on the new CELL_SIZE
    PLAYER_COLLISION_RADIUS = (0.3 * CELL_SIZE); // Roughly 30% of cell size
    GOAL_RADIUS = (0.4 * CELL_SIZE); // Roughly 40% of cell size

    // Adjust player and goal size based on CELL_SIZE
    player.style.width = CELL_SIZE + 'px';
    player.style.height = CELL_SIZE + 'px';
    goal.style.width = CELL_SIZE + 'px';
    goal.style.height = CELL_SIZE + 'px';
}


function initializeGrid() {
    grid = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        grid[y] = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            grid[y][x] = {
                x,
                y,
                visited: false,
                walls: {
                    top: true,
                    right: true,
                    bottom: true,
                    left: true
                }
            };
        }
    }
}

function generateMaze() {
    maze.innerHTML = ''; // Clear previous maze walls
    walls = []; // Clear walls array

    const stack = [];
    const startCell = grid[0][0];
    startCell.visited = true;
    stack.push(startCell);

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const unvisitedNeighbors = [];

        // Check neighbors
        if (current.y > 0 && !grid[current.y - 1][current.x].visited) {
            unvisitedNeighbors.push(grid[current.y - 1][current.x]); // Top
        }
        if (current.x < GRID_WIDTH - 1 && !grid[current.y][current.x + 1].visited) {
            unvisitedNeighbors.push(grid[current.y][current.x + 1]); // Right
        }
        if (current.y < GRID_HEIGHT - 1 && !grid[current.y + 1][current.x].visited) {
            unvisitedNeighbors.push(grid[current.y + 1][current.x]); // Bottom
        }
        if (current.x > 0 && !grid[current.y][current.x - 1].visited) {
            unvisitedNeighbors.push(grid[current.y][current.x - 1]); // Left
        }

        if (unvisitedNeighbors.length > 0) {
            const chosen = unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];

            // Remove walls between current and chosen
            if (chosen.y < current.y) { // Chosen is top
                current.walls.top = false;
                chosen.walls.bottom = false;
            } else if (chosen.x > current.x) { // Chosen is right
                current.walls.right = false;
                chosen.walls.left = false;
            } else if (chosen.y > current.y) { // Chosen is bottom
                current.walls.bottom = false;
                chosen.walls.top = false;
            } else if (chosen.x < current.x) { // Chosen is left
                current.walls.left = false;
                chosen.walls.right = false;
            }

            chosen.visited = true;
            stack.push(chosen);
        } else {
            stack.pop();
        }
    }

    // Add walls to the DOM
    // Outer walls (using CELL_SIZE * GRID_WIDTH/HEIGHT)
    addWall(0, 0, CELL_SIZE * GRID_WIDTH, WALL_THICKNESS);
    addWall(CELL_SIZE * GRID_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, CELL_SIZE * GRID_HEIGHT);
    addWall(0, CELL_SIZE * GRID_HEIGHT - WALL_THICKNESS, CELL_SIZE * GRID_WIDTH, WALL_THICKNESS);
    addWall(0, 0, WALL_THICKNESS, CELL_SIZE * GRID_HEIGHT);

    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const cell = grid[y][x];
            const cellX = x * CELL_SIZE;
            const cellY = y * CELL_SIZE;

            if (cell.walls.top && y > 0) {
                addWall(cellX, cellY, CELL_SIZE, WALL_THICKNESS);
            }
            if (cell.walls.right && x < GRID_WIDTH - 1) {
                addWall(cellX + CELL_SIZE - WALL_THICKNESS, cellY, WALL_THICKNESS, CELL_SIZE);
            }
            if (cell.walls.bottom && y < GRID_HEIGHT - 1) {
                addWall(cellX, cellY + CELL_SIZE - WALL_THICKNESS, CELL_SIZE, WALL_THICKNESS);
            }
            if (cell.walls.left && x > 0) {
                addWall(cellX, cellY, WALL_THICKNESS, CELL_SIZE);
            }
        }
    }
}

function addWall(x, y, width, height) {
    const wall = document.createElement('div');
    wall.className = 'wall';
    wall.style.left = x + 'px';
    wall.style.top = y + 'px';
    wall.style.width = width + 'px';
    wall.style.height = height + 'px';
    maze.appendChild(wall);
    walls.push({ x, y, width, height });
}

function isMazeSolvable() {
    const q = [];
    const visited = new Set();
    const startCell = grid[0][0];
    const endCell = grid[GRID_HEIGHT - 1][GRID_WIDTH - 1];

    q.push(startCell);
    visited.add(`${startCell.x},${startCell.y}`);

    while (q.length > 0) {
        const current = q.shift();

        if (current === endCell) {
            return true;
        }

        const neighbors = [];
        if (current.y > 0 && !current.walls.top) { // Top
            neighbors.push(grid[current.y - 1][current.x]);
        }
        if (current.x < GRID_WIDTH - 1 && !current.walls.right) { // Right
            neighbors.push(grid[current.y][current.x + 1]);
        }
        if (current.y < GRID_HEIGHT - 1 && !current.walls.bottom) { // Bottom
            neighbors.push(grid[current.y + 1][current.x]);
        }
        if (current.x > 0 && !current.walls.left) { // Left
            neighbors.push(grid[current.y][current.x - 1]);
        }

        for (let neighbor of neighbors) {
            if (!visited.has(`${neighbor.x},${neighbor.y}`)) {
                visited.add(`${neighbor.x},${neighbor.y}`);
                q.push(neighbor);
            }
        }
    }

    return false;
}

function placePlayerAndGoal() {
    // Player starts at top-left of maze, centered in first cell
    playerX = CELL_SIZE / 2;
    playerY = CELL_SIZE / 2;
    player.style.left = playerX + 'px';
    player.style.top = playerY + 'px';

    // Goal at bottom-right of maze, centered in last cell
    goalX = (GRID_WIDTH - 1) * CELL_SIZE + CELL_SIZE / 2;
    goalY = (GRID_HEIGHT - 1) * CELL_SIZE + CELL_SIZE / 2;
    goal.style.left = goalX + 'px';
    goal.style.top = goalY + 'px';
}

function createFloatingHearts() {
    document.querySelectorAll('.floating-heart').forEach(h => h.remove()); // Clear existing hearts
    const numberOfHearts = 10;
    for (let i = 0; i < numberOfHearts; i++) {
        const heart = document.createElement('div');
        heart.className = 'floating-heart';
        // Use gameArea.offsetWidth for responsive positioning
        heart.style.left = Math.random() * gameArea.offsetWidth + 'px';
        heart.style.top = gameArea.offsetHeight + Math.random() * 100 + 'px'; // Start below the maze
        heart.style.animationDelay = `${Math.random() * 5}s`;
        heart.style.opacity = Math.random() * 0.5 + 0.3;
        heart.style.transform = `scale(${Math.random() * 0.5 + 0.5})`;

        const heartSvg = `<svg width="20" height="20" viewBox="0 0 100 100">
            <path d="M50,90 C50,90 0,50 0,25 C0,10 10,0 25,0 C35,0 45,10 50,20 C55,10 65,0 75,0 C90,0 100,10 100,25 C100,50 50,90 50,90 Z" fill="red"/>
        </svg>`;
        heart.innerHTML = heartSvg;
        maze.appendChild(heart);
    }
}


// Comprehensive Circle-Rectangle collision detection
function checkCollision(cx, cy) {
    const playerRadius = PLAYER_COLLISION_RADIUS;

    // Check boundaries first, as they are simpler rectangular collisions
    if (cx - playerRadius < 0 || cx + playerRadius > (GRID_WIDTH * CELL_SIZE) ||
        cy - playerRadius < 0 || cy + playerRadius > (GRID_HEIGHT * CELL_SIZE)) {
        return true;
    }

    for (let wall of walls) {
        let testX = cx;
        let testY = cy;

        if (cx < wall.x) {
            testX = wall.x;
        } else if (cx > wall.x + wall.width) {
            testX = wall.x + wall.width;
        }

        if (cy < wall.y) {
            testY = wall.y;
        } else if (cy > wall.y + wall.height) {
            testY = wall.y + wall.height;
        }

        let distX = cx - testX;
        let distY = cy - testY;
        let distanceSquared = (distX * distX) + (distY * distY);

        if (distanceSquared <= (playerRadius * playerRadius)) {
            return true;
        }
    }

    return false;
}

// Check if player reached the goal
function checkGoal() {
    const dx = playerX - goalX;
    const dy = playerY - goalY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < (PLAYER_COLLISION_RADIUS + GOAL_RADIUS)) {
        // Updated message content
        message.innerHTML = "Even if I could gather every word from every language in the universe, it still wouldn’t be enough to express the depth of my love for you.<br><br>Will you be my Valentine's Date? ❤️";
        message.style.opacity = 1;
        restartBtn.style.opacity = 1;
        restartBtn.style.pointerEvents = 'all';
        currentMoveX = 0;
        currentMoveY = 0;
        showTitles(); // Show titles when the goal is reached
    }
}


function updatePlayerPosition() {
    let newPlayerX = playerX + currentMoveX;
    let newPlayerY = playerY + currentMoveY;

    // Check collision for new X position
    if (!checkCollision(newPlayerX, playerY)) {
        playerX = newPlayerX;
    } else {
        currentMoveX = 0; // Stop movement in X if collision
    }

    // Check collision for new Y position
    if (!checkCollision(playerX, newPlayerY)) {
        playerY = newPlayerY;
    } else {
        currentMoveY = 0; // Stop movement in Y if collision
    }

    player.style.left = playerX + 'px';
    player.style.top = playerY + 'px';
}


function updateJoystickPosition(pointerX, pointerY) {
    const joystickRect = joystickHandle.parentElement.getBoundingClientRect();
    const containerX = joystickRect.left + joystickCenterX;
    const containerY = joystickRect.top + joystickCenterY;

    let dx = pointerX - containerX;
    let dy = pointerY - containerY;

    // Calculate distance and angle for the handle's visual position
    let angle = Math.atan2(dy, dx);
    let distance = Math.sqrt(dx * dx + dy * dy);

    // Clamp handle's visual distance to maxVisualHandleDistance
    let visualDistance = Math.min(distance, maxVisualHandleDistance);
    let visualHandleX = joystickCenterX + Math.cos(angle) * visualDistance;
    let visualHandleY = joystickCenterY + Math.sin(angle) * visualDistance;

    joystickHandle.style.left = visualHandleX + 'px';
    joystickHandle.style.top = visualHandleY + 'px';


    // Calculate player movement based on playerMovementMaxDistance
    let movementMagnitude = Math.min(distance, playerMovementMaxDistance);
    let normalizedForce = 0;

    if (movementMagnitude > movementDeadZone) {
        normalizedForce = (movementMagnitude - movementDeadZone) / (playerMovementMaxDistance - movementDeadZone);
    }

    currentMoveX = Math.cos(angle) * playerSpeed * normalizedForce;
    currentMoveY = Math.sin(angle) * playerSpeed * normalizedForce;
}


function resetJoystick() {
    joystickHandle.style.left = joystickCenterX + 'px';
    joystickHandle.style.top = joystickCenterY + 'px';
    currentMoveX = 0;
    currentMoveY = 0;
}

// Joystick event listeners (using pointer events for better mobile support)
joystickHandle.parentElement.addEventListener('pointerdown', (e) => {
    isJoystickActive = true;
    joystickHandle.setPointerCapture(e.pointerId);
    updateJoystickPosition(e.clientX, e.clientY);
});

joystickHandle.parentElement.addEventListener('pointermove', (e) => {
    if (isJoystickActive) {
        updateJoystickPosition(e.clientX, e.clientY);
    }
});

joystickHandle.parentElement.addEventListener('pointerup', () => {
    isJoystickActive = false;
    resetJoystick();
});

joystickHandle.parentElement.addEventListener('pointerleave', (e) => {
    // Only reset if the pointer leaves AND was active (e.g., dragged off the container)
    if (isJoystickActive) {
        isJoystickActive = false;
        resetJoystick();
    }
});


// Add new functions for hiding/showing titles
function hideTitles() {
    loveTitle.style.opacity = '0';
    subtitle.style.opacity = '0';
    loveTitle.style.pointerEvents = 'none'; // Disable pointer events when hidden
    subtitle.style.pointerEvents = 'none'; // Disable pointer events when hidden
}

function showTitles() {
    loveTitle.style.opacity = '1';
    subtitle.style.opacity = '0.95';
    loveTitle.style.pointerEvents = 'auto'; // Re-enable pointer events when shown
    subtitle.style.pointerEvents = 'auto'; // Re-enable pointer events when shown
}


function update() {
    if (isJoystickActive) {
        updatePlayerPosition();
    }
    checkGoal();
    requestAnimationFrame(update);
}

function startGame() {
    document.querySelectorAll('.floating-heart').forEach(h => h.remove());

    let attempts = 0;
    const MAX_ATTEMPTS = 100;

    // Ensure CELL_SIZE and other responsive elements are set before maze generation
    setupGameAreaAndContainer();

    do {
        initializeGrid();
        generateMaze();
        attempts++;
        if (attempts > MAX_ATTEMPTS) {
            console.warn("Max maze generation attempts reached. Maze might still be unsolvable.");
            break;
        }
    } while (!isMazeSolvable());

    placePlayerAndGoal();
    createFloatingHearts();
    resetJoystick();
    update();
    message.style.opacity = "0";
    restartBtn.style.opacity = "0";
    restartBtn.style.pointerEvents = "none";

    // NEW: Show titles initially, then hide after a delay
    showTitles(); // Ensure they are visible at the start of a new game
    setTimeout(hideTitles, 2500); // Hide after 2.5 seconds
}

restartBtn.addEventListener('click', function() {
    startGame();
    showTitles(); // Ensure titles are shown immediately when restarting
});
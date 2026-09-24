"use strict";
{
const TILE_SIZE = 32;
const MAP_WIDTH = 25;
const MAP_HEIGHT = 20;

const TileType = {
  WALL: 0,
  FLOOR: 1,
  DOOR: 2,
};

const canvas = document.getElementById("gameCanvas2");
const context = canvas.getContext("2d");
const game2Info = document.getElementById("game2Info");
const restartButton = document.getElementById("game2restartButton");

canvas.width = MAP_WIDTH * TILE_SIZE;
canvas.height = MAP_HEIGHT * TILE_SIZE;

let gameRunning = false;
let gameState = null;
let levelTimer = null;

function createGameState(level, existingPlayer, existingScrolls) {
  const newMap = Array.from({ length: MAP_HEIGHT }, () =>
    Array(MAP_WIDTH).fill(TileType.WALL)
  );
  const rooms = [];

  // Generate rooms
  for (let i = 0; i < 6; i++) {
    const w = Math.floor(Math.random() * 4) + 4;
    const h = Math.floor(Math.random() * 4) + 4;
    const x = Math.floor(Math.random() * (MAP_WIDTH - w - 2)) + 1;
    const y = Math.floor(Math.random() * (MAP_HEIGHT - h - 2)) + 1;

    for (let ry = y; ry < y + h; ry++) {
      for (let rx = x; rx < x + w; rx++) {
        newMap[ry][rx] = TileType.FLOOR;
      }
    }
    rooms.push({ x, y, w, h });
  }

  // Connect rooms
  for (let i = 0; i < rooms.length - 1; i++) {
    const cur = rooms[i];
    const next = rooms[i + 1];
    const curX = Math.floor(cur.x + cur.w / 2);
    const curY = Math.floor(cur.y + cur.h / 2);
    const nextX = Math.floor(next.x + next.w / 2);
    const nextY = Math.floor(next.y + next.h / 2);

    for (let x = Math.min(curX, nextX); x <= Math.max(curX, nextX); x++) {
      newMap[curY][x] = TileType.FLOOR;
    }
    for (let y = Math.min(curY, nextY); y <= Math.max(curY, nextY); y++) {
      newMap[y][nextX] = TileType.FLOOR;
    }
  }

  const startRoom = rooms[0];

  const player = existingPlayer
    ? {
        ...existingPlayer,
        x: startRoom.x + 1,
        y: startRoom.y + 1,
        hp: Math.max(existingPlayer.hp, 1),
      }
    : {
        id: "player",
        x: startRoom.x + 1,
        y: startRoom.y + 1,
        hp: 100,
        maxHp: 100,
        type: "player",
        symbol: "🧙‍♂️",
        color: "#3b82f6",
      };

  const enemies = [];
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    const enemyHp = 30 + level * 5;
    enemies.push({
      id: `e-${level}-${i}`,
      x: room.x + Math.floor(room.w / 2),
      y: room.y + Math.floor(room.h / 2),
      hp: enemyHp,
      maxHp: enemyHp,
      type: "enemy",
      symbol: Math.random() > 0.5 ? "👹" : "💀",
      color: "#ef4444",
    });
  }

  const items = [];
  const scrollRoom = rooms[Math.floor(Math.random() * (rooms.length - 1)) + 1];
  items.push({
    id: `scroll-${level}`,
    x: scrollRoom.x + 1,
    y: scrollRoom.y + 1,
    type: "scroll",
    symbol: "📜",
  });

  const potionRoom = rooms[Math.floor(Math.random() * (rooms.length - 1)) + 1];
  items.push({
    id: `potion-${level}`,
    x: potionRoom.x + 2,
    y: potionRoom.y + 2,
    type: "potion",
    symbol: "🧪",
  });

  return {
    player,
    enemies,
    items,
    projectiles: [],
    explosions: [],
    map: newMap,
    level,
    scrolls:
      existingScrolls !== undefined ? existingScrolls : level === 1 ? 3 : 0,
    gameOver: false,
    message:
      level === 1
        ? "Find scrolls and defeat all monsters!"
        : `Floor ${level} reached.`,
  };
}

function initGame(level, existingPlayer, existingScrolls) {
  clearTimeout(levelTimer);
  gameState = createGameState(level, existingPlayer, existingScrolls);
  renderGame();
}

function startGame2() {
  gameRunning = true;
  if (!gameState || gameState.gameOver) {
    initGame(1);
  } else {
    renderGame();
  }
}

function stopGame2() {
  gameRunning = false;
  clearTimeout(levelTimer);
  context.fillStyle = "#111827";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#9ca3af";
  context.font = "24px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    "Game 2 is powered off",
    canvas.width / 2,
    canvas.height / 2
  );
}

function movePlayer(dx, dy) {
  if (!gameState || gameState.gameOver) return;

  const newX = gameState.player.x + dx;
  const newY = gameState.player.y + dy;

  if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) return;
  if (gameState.map[newY][newX] === TileType.WALL) return;

  const enemyAtPos = gameState.enemies.find(
    (e) => e.x === newX && e.y === newY
  );
  if (enemyAtPos) {
    attackEnemy(enemyAtPos.id);
    return;
  }

  const itemAtPos = gameState.items.find((i) => i.x === newX && i.y === newY);

  let newScrolls = gameState.scrolls;
  let newHp = gameState.player.hp;
  let newItems = gameState.items;
  let msg = "Moving...";

  if (itemAtPos) {
    newItems = gameState.items.filter((i) => i.id !== itemAtPos.id);
    if (itemAtPos.type === "scroll") {
      newScrolls += 3;
      msg = "Picked up a Magic Scroll (Fireball)!";
    } else if (itemAtPos.type === "potion") {
      newHp = Math.min(gameState.player.maxHp, newHp + 30);
      msg = "Drank a Health Potion!";
    }
  }

  gameState = {
    ...gameState,
    player: { ...gameState.player, x: newX, y: newY, hp: newHp },
    items: newItems,
    scrolls: newScrolls,
    message: msg,
  };

  gameState = moveEnemies(gameState);
  renderGame();
}

function attackEnemy(enemyId) {
  if (!gameState || gameState.gameOver) return;

  const enemy = gameState.enemies.find((e) => e.id === enemyId);
  if (!enemy) return;

  enemy.hp -= 15;
  gameState.message = "You struck the monster!";

  if (enemy.hp <= 0) {
    gameState.enemies = gameState.enemies.filter((e) => e.id !== enemyId);
    gameState.message = "Monster defeated!";
  }

  if (gameState.enemies.length === 0) {
    gameState.message = "Level Cleared!";
    renderGame();
    levelTimer = setTimeout(() => {
      initGame(gameState.level + 1, gameState.player, gameState.scrolls);
    }, 700);
    return;
  }

  gameState = moveEnemies(gameState);
  renderGame();
}

function castSpell(dx, dy) {
  if (!gameState || gameState.gameOver) return;
  if (gameState.scrolls <= 0) {
    gameState.message = "You have no magic scrolls!";
    renderGame();
    return;
  }

  gameState.scrolls--;

  gameState.projectiles.push({
    id: `projectile-${Date.now()}`,
    x: gameState.player.x,
    y: gameState.player.y,
    dx: dx,
    dy: dy,
    color: "#facc15",
  });

  gameState.message = "You cast a magic bolt!";
  gameState = moveEnemies(gameState);
  renderGame();
}
function getEnemyMove(enemy, state, reservedPositions) {
  const player = state.player;
  const startKey = `${enemy.x},${enemy.y}`;

  const queue = [
    {
      x: enemy.x,
      y: enemy.y,
      firstMove: null,
    },
  ];

  const visited = new Set([startKey]);

  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  while (queue.length > 0) {
    const current = queue.shift();

    for (const direction of directions) {
      const nextX = current.x + direction.x;
      const nextY = current.y + direction.y;
      const nextKey = `${nextX},${nextY}`;

      if (nextX < 0 || nextX >= MAP_WIDTH || nextY < 0 || nextY >= MAP_HEIGHT) {
        continue;
      }

      if (visited.has(nextKey)) continue;
      visited.add(nextKey);

      if (state.map[nextY][nextX] === TileType.WALL) {
        continue;
      }

      const containsItem = state.items.some(
        (item) => item.x === nextX && item.y === nextY
      );

      if (containsItem) continue;

      if (reservedPositions.has(nextKey)) {
        continue;
      }

      // The player tile is not entered.
      // An adjacent enemy attacks instead.
      if (nextX === player.x && nextY === player.y) {
        continue;
      }

      const firstMove = current.firstMove || {
        x: nextX,
        y: nextY,
      };

      const distanceToPlayer =
        Math.abs(nextX - player.x) + Math.abs(nextY - player.y);

      if (distanceToPlayer === 1) {
        return firstMove;
      }

      queue.push({
        x: nextX,
        y: nextY,
        firstMove,
      });
    }
  }

  return null;
}

function moveEnemies(state) {
  let enemies = [...state.enemies];
  let msg = state.message;
  let playerHp = state.player.hp;
  let activeProjectiles = [...state.projectiles];
  const explosions = [];
  const processedProjectiles = [];

  // Update projectiles
  for (const p of activeProjectiles) {
    let currentX = p.x;
    let currentY = p.y;
    let exploded = false;

    for (let step = 0; step < 2; step++) {
      currentX += p.dx;
      currentY += p.dy;

      if (
        currentX < 0 ||
        currentX >= MAP_WIDTH ||
        currentY < 0 ||
        currentY >= MAP_HEIGHT ||
        state.map[currentY][currentX] === TileType.WALL
      ) {
        exploded = true;
        break;
      }

      const hitEnemy = enemies.find(
        (e) => e.x === currentX && e.y === currentY
      );
      if (hitEnemy) {
        exploded = true;
        break;
      }
    }

    if (exploded) {
      msg = "Magic bolt exploded in a 5x5 area!";
      explosions.push({ x: currentX, y: currentY, radius: 2 });

      enemies = enemies.map((e) => {
        if (Math.max(Math.abs(e.x - currentX), Math.abs(e.y - currentY)) <= 2) {
          return { ...e, hp: Math.max(0, e.hp - 20) };
        }
        return e;
      });
    } else {
      processedProjectiles.push({ ...p, x: currentX, y: currentY });
    }
  }

  enemies = enemies.filter((e) => e.hp > 0);

  if (enemies.length === 0) {
    levelTimer = setTimeout(() => {
      initGame(state.level + 1, state.player, state.scrolls);
    }, 500);
    return {
      ...state,
      enemies: [],
      projectiles: [],
      explosions: [],
      message: "Level Cleared!",
    };
  }

  // Enemy AI// Enemy AI
  const newEnemies = [];

  // Reserve every enemy's current position first.
  const reservedPositions = new Set(
    enemies.map((enemy) => `${enemy.x},${enemy.y}`)
  );

  for (const enemy of enemies) {
    const currentKey = `${enemy.x},${enemy.y}`;

    // This enemy is now being processed, so its old position
    // can be considered available.
    reservedPositions.delete(currentKey);

    const distToPlayer =
      Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y);

    // Attack instead of moving.
    if (distToPlayer === 1) {
      playerHp -= 8;
      msg = "The monster strikes!";

      // Keep this enemy in place.
      reservedPositions.add(currentKey);
      newEnemies.push(enemy);
      continue;
    }

    const nextMove = getEnemyMove(enemy, state, reservedPositions);

    if (nextMove) {
      const nextKey = `${nextMove.x},${nextMove.y}`;

      newEnemies.push({
        ...enemy,
        x: nextMove.x,
        y: nextMove.y,
      });

      reservedPositions.add(nextKey);
    } else {
      // No available path, so stay still.
      reservedPositions.add(currentKey);
      newEnemies.push(enemy);
    }
  }

  return {
    ...state,
    enemies: newEnemies,
    projectiles: processedProjectiles,
    explosions,
    player: { ...state.player, hp: playerHp },
    gameOver: playerHp <= 0,
    message: playerHp <= 0 ? "Game Over!" : msg,
  };
}

function drawText(symbol, x, y) {
  context.font = `${TILE_SIZE - 4}px Arial`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    symbol,
    x * TILE_SIZE + TILE_SIZE / 2,
    y * TILE_SIZE + TILE_SIZE / 2
  );
}

function renderGame() {
  if (!gameState) return;

  context.clearRect(0, 0, canvas.width, canvas.height);

  // Draw map
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      context.fillStyle =
        gameState.map[y][x] === TileType.WALL ? "#111827" : "#374151";
      context.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      context.strokeStyle = "#1f2937";
      context.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // Draw items
  for (const item of gameState.items) {
    drawText(item.symbol, item.x, item.y);
  }

  // Draw explosions
  for (const explosion of gameState.explosions) {
    context.fillStyle = "rgba(250, 204, 21, 0.35)";
    context.beginPath();
    context.arc(
      explosion.x * TILE_SIZE + TILE_SIZE / 2,
      explosion.y * TILE_SIZE + TILE_SIZE / 2,
      explosion.radius * TILE_SIZE,
      0,
      Math.PI * 2
    );
    context.fill();
  }

  // Draw projectiles
  for (const p of gameState.projectiles) {
    context.fillStyle = p.color;
    context.beginPath();
    context.arc(
      p.x * TILE_SIZE + TILE_SIZE / 2,
      p.y * TILE_SIZE + TILE_SIZE / 2,
      7,
      0,
      Math.PI * 2
    );
    context.fill();
  }

  // Draw enemies
  for (const enemy of gameState.enemies) {
    drawText(enemy.symbol, enemy.x, enemy.y);
  }

  // Draw player
  drawText(gameState.player.symbol, gameState.player.x, gameState.player.y);

  updateGameInfo();
}

function updateGameInfo() {
  if (!gameInfo || !gameState) return;

  gameInfo.innerHTML = `
    <p>
      ❤️ HP: ${gameState.player.hp}/${gameState.player.maxHp}
      &nbsp;|&nbsp;
      📜 Scrolls: ${gameState.scrolls}
      &nbsp;|&nbsp;
      Floor: ${gameState.level}
    </p>
    <p>${gameState.message}</p>
    <p>WASD = move &nbsp;|&nbsp; Arrow keys = fire</p>
  `;

  if (restartButton) {
    restartButton.style.display = gameState.gameOver ? "inline-block" : "none";
  }
}

// Controls: WASD = move, Arrow keys = fire
window.addEventListener("keydown", (event) => {
  if (!gameRunning) return;

  const moveKeys = {
    w: [0, -1],
    W: [0, -1],
    s: [0, 1],
    S: [0, 1],
    a: [-1, 0],
    A: [-1, 0],
    d: [1, 0],
    D: [1, 0],
  };

  if (moveKeys[event.key]) {
    event.preventDefault();
    const [dx, dy] = moveKeys[event.key];
    movePlayer(dx, dy);
    return;
  }

  const fireKeys = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  };

  if (fireKeys[event.key]) {
    event.preventDefault();
    const [dx, dy] = fireKeys[event.key];
    castSpell(dx, dy);
  }
});

if (restartButton) {
  restartButton.addEventListener("click", () => {
    initGame(1);
    gameRunning = true;
  });
}

window.startGame2 = startGame2;
window.stopGame2 = stopGame2;

// Start in powered-off state
stopGame2();
}

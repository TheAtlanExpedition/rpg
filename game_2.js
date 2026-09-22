'use strict';

const TILE_SIZE = 32;
const MAP_WIDTH = 25;
const MAP_HEIGHT = 20;

const TileType = {
  WALL: 0,
  FLOOR: 1,
  DOOR: 2,
};

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const gameInfo = document.getElementById('gameInfo');
const restartButton = document.getElementById('restartButton');

canvas.width = MAP_WIDTH * TILE_SIZE;
canvas.height = MAP_HEIGHT * TILE_SIZE;

let gameState = null;
let levelTimer = null;

function createGameState(level, existingPlayer, existingScrolls) {
  const newMap = Array.from(
    { length: MAP_HEIGHT },
    () => Array(MAP_WIDTH).fill(TileType.WALL)
  );

  const rooms = [];

  // Generate rooms
  for (let i = 0; i < 6; i++) {
    const width = Math.floor(Math.random() * 4) + 4;
    const height = Math.floor(Math.random() * 4) + 4;

    const x =
      Math.floor(Math.random() * (MAP_WIDTH - width - 2)) + 1;

    const y =
      Math.floor(Math.random() * (MAP_HEIGHT - height - 2)) + 1;

    for (let roomY = y; roomY < y + height; roomY++) {
      for (let roomX = x; roomX < x + width; roomX++) {
        newMap[roomY][roomX] = TileType.FLOOR;
      }
    }

    rooms.push({
      x,
      y,
      width,
      height,
    });
  }

  // Connect rooms with corridors
  for (let i = 0; i < rooms.length - 1; i++) {
    const currentRoom = rooms[i];
    const nextRoom = rooms[i + 1];

    const currentX = Math.floor(
      currentRoom.x + currentRoom.width / 2
    );

    const currentY = Math.floor(
      currentRoom.y + currentRoom.height / 2
    );

    const nextX = Math.floor(nextRoom.x + nextRoom.width / 2);
    const nextY = Math.floor(nextRoom.y + nextRoom.height / 2);

    for (
      let x = Math.min(currentX, nextX);
      x <= Math.max(currentX, nextX);
      x++
    ) {
      newMap[currentY][x] = TileType.FLOOR;
    }

    for (
      let y = Math.min(currentY, nextY);
      y <= Math.max(currentY, nextY);
      y++
    ) {
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
        id: 'player',
        x: startRoom.x + 1,
        y: startRoom.y + 1,
        hp: 100,
        maxHp: 100,
        type: 'player',
        symbol: '🧙‍♂️',
        color: '#3b82f6',
      };

  const enemies = [];

  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    const enemyHp = 30 + level * 5;

    enemies.push({
      id: `enemy-${level}-${i}`,
      x: room.x + Math.floor(room.width / 2),
      y: room.y + Math.floor(room.height / 2),
      hp: enemyHp,
      maxHp: enemyHp,
      type: 'enemy',
      symbol: Math.random() > 0.5 ? '👹' : '💀',
      color: '#ef4444',
    });
  }

  const items = [];

  const scrollRoom =
    rooms[Math.floor(Math.random() * (rooms.length - 1)) + 1];

  items.push({
    id: `scroll-${level}`,
    x: scrollRoom.x + 1,
    y: scrollRoom.y + 1,
    type: 'scroll',
    symbol: '📜',
  });

  const potionRoom =
    rooms[Math.floor(Math.random() * (rooms.length - 1)) + 1];

  items.push({
    id: `potion-${level}`,
    x: potionRoom.x + 2,
    y: potionRoom.y + 2,
    type: 'potion',
    symbol: '🧪',
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
      existingScrolls !== undefined
        ? existingScrolls
        : level === 1
          ? 3
          : 0,
    gameOver: false,
    message:
      level === 1
        ? 'Find scrolls and defeat all monsters!'
        : `Floor ${level} reached.`,
  };
}

function initGame(level, existingPlayer, existingScrolls) {
  clearTimeout(levelTimer);

  gameState = createGameState(
    level,
    existingPlayer,
    existingScrolls
  );

  renderGame();
}

function movePlayer(dx, dy) {
  if (!gameState || gameState.gameOver) return;

  const newX = gameState.player.x + dx;
  const newY = gameState.player.y + dy;

  if (
    newX < 0 ||
    newX >= MAP_WIDTH ||
    newY < 0 ||
    newY >= MAP_HEIGHT
  ) {
    return;
  }

  if (gameState.map[newY][newX] === TileType.WALL) {
    return;
  }

  const enemy = gameState.enemies.find(
    currentEnemy =>
      currentEnemy.x === newX && currentEnemy.y === newY
  );

  if (enemy) {
    attackEnemy(enemy.id);
    return;
  }

  const item = gameState.items.find(
    currentItem =>
      currentItem.x === newX && currentItem.y === newY
  );

  let message = 'Moving...';

  gameState.player.x = newX;
  gameState.player.y = newY;

  if (item) {
    gameState.items = gameState.items.filter(
      currentItem => currentItem.id !== item.id
    );

    if (item.type === 'scroll') {
      gameState.scrolls += 3;
      message = 'Picked up a Magic Scroll: 3 charges!';
    }

    if (item.type === 'potion') {
      gameState.player.hp = Math.min(
        gameState.player.maxHp,
        gameState.player.hp + 30
      );

      message = 'Drank a Health Potion!';
    }
  }

  gameState.message = message;

  moveEnemies();
  renderGame();
}

function attackEnemy(enemyId) {
  if (!gameState || gameState.gameOver) return;

  const enemy = gameState.enemies.find(
    currentEnemy => currentEnemy.id === enemyId
  );

  if (!enemy) return;

  enemy.hp -= 15;
  gameState.message = 'You struck the monster!';

  if (enemy.hp <= 0) {
    gameState.enemies = gameState.enemies.filter(
      currentEnemy => currentEnemy.id !== enemyId
    );

    gameState.message = 'Monster defeated!';
  }

  if (gameState.enemies.length === 0) {
    gameState.message = 'Level Cleared!';
    renderGame();

    levelTimer = setTimeout(() => {
      initGame(
        gameState.level + 1,
        gameState.player,
        gameState.scrolls
      );
    }, 700);

    return;
  }

  moveEnemies();
  renderGame();
}

function castSpell() {
  if (!gameState || gameState.gameOver) return;

  if (gameState.scrolls <= 0) {
    gameState.message = 'You have no magic scrolls!';
    renderGame();
    return;
  }

  gameState.scrolls--;

  const direction =
    gameState.player.x < MAP_WIDTH / 2 ? 1 : -1;

  gameState.projectiles.push({
    id: `projectile-${Date.now()}`,
    x: gameState.player.x,
    y: gameState.player.y,
    dx: direction,
    dy: 0,
    color: '#facc15',
  });

  gameState.message = 'You cast a magic bolt!';

  moveEnemies();
  renderGame();
}

function moveEnemies() {
  if (!gameState || gameState.gameOver) return;

  const processedProjectiles = [];
  const explosions = [];

  // Move projectiles
  for (const projectile of gameState.projectiles) {
    let currentX = projectile.x;
    let currentY = projectile.y;
    let exploded = false;

    for (let step = 0; step < 2; step++) {
      currentX += projectile.dx;
      currentY += projectile.dy;

      const outsideMap =
        currentX < 0 ||
        currentX >= MAP_WIDTH ||
        currentY < 0 ||
        currentY >= MAP_HEIGHT;

      const hitWall =
        !outsideMap &&
        gameState.map[currentY][currentX] === TileType.WALL;

      if (outsideMap || hitWall) {
        exploded = true;
        break;
      }

      const hitEnemy = gameState.enemies.some(
        enemy =>
          enemy.x === currentX && enemy.y === currentY
      );

      if (hitEnemy) {
        exploded = true;
        break;
      }
    }

    if (exploded) {
      explosions.push({
        x: currentX,
        y: currentY,
        radius: 2,
      });

      gameState.message =
        'Magic bolt exploded in a 5x5 area!';

      for (const enemy of gameState.enemies) {
        const distance = Math.max(
          Math.abs(enemy.x - currentX),
          Math.abs(enemy.y - currentY)
        );

        if (distance <= 2) {
          enemy.hp -= 20;
        }
      }
    } else {
      processedProjectiles.push({
        ...projectile,
        x: currentX,
        y: currentY,
      });
    }
  }

  gameState.projectiles = processedProjectiles;
  gameState.explosions = explosions;

  gameState.enemies = gameState.enemies.filter(
    enemy => enemy.hp > 0
  );

  if (gameState.enemies.length === 0) {
    gameState.message = 'Level Cleared!';
    renderGame();

    levelTimer = setTimeout(() => {
      initGame(
        gameState.level + 1,
        gameState.player,
        gameState.scrolls
      );
    }, 700);

    return;
  }

  // Enemy movement and attacks
  const newEnemies = [];

  for (const enemy of gameState.enemies) {
    const distanceToPlayer =
      Math.abs(enemy.x - gameState.player.x) +
      Math.abs(enemy.y - gameState.player.y);

    if (distanceToPlayer === 1) {
      gameState.player.hp -= 8;
      gameState.message = 'The monster strikes!';
      newEnemies.push(enemy);
      continue;
    }

    if (distanceToPlayer > 5) {
      newEnemies.push(enemy);
      continue;
    }

    const dx =
      gameState.player.x > enemy.x
        ? 1
        : gameState.player.x < enemy.x
          ? -1
          : 0;

    const dy =
      gameState.player.y > enemy.y
        ? 1
        : gameState.player.y < enemy.y
          ? -1
          : 0;

    const possibleMoves = [
      {
        x: enemy.x + dx,
        y: enemy.y,
      },
      {
        x: enemy.x,
        y: enemy.y + dy,
      },
    ];

    let moved = false;

    for (const move of possibleMoves) {
      const outsideMap =
        move.x < 0 ||
        move.x >= MAP_WIDTH ||
        move.y < 0 ||
        move.y >= MAP_HEIGHT;

      if (outsideMap) continue;

      if (gameState.map[move.y][move.x] === TileType.WALL) {
        continue;
      }

      if (
        move.x === gameState.player.x &&
        move.y === gameState.player.y
      ) {
        continue;
      }

      const occupied = newEnemies.some(
        other =>
          other.x === move.x && other.y === move.y
      );

      if (occupied) continue;

      const itemBlocking = gameState.items.some(
        item =>
          item.x === move.x && item.y === move.y
      );

      if (itemBlocking) continue;

      newEnemies.push({
        ...enemy,
        x: move.x,
        y: move.y,
      });

      moved = true;
      break;
    }

    if (!moved) {
      newEnemies.push(enemy);
    }
  }

  gameState.enemies = newEnemies;

  if (gameState.player.hp <= 0) {
    gameState.player.hp = 0;
    gameState.gameOver = true;
    gameState.message = 'Game Over!';
  }

  renderGame();
}

function drawText(symbol, x, y) {
  context.font = `${TILE_SIZE - 4}px Arial`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  context.fillText(
    symbol,
    x * TILE_SIZE + TILE_SIZE / 2,
    y * TILE_SIZE + TILE_SIZE / 2
  );
}

function renderGame() {
  if (!gameState) return;

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Draw map
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (gameState.map[y][x] === TileType.WALL) {
        context.fillStyle = '#111827';
      } else {
        context.fillStyle = '#374151';
      }

      context.fillRect(
        x * TILE_SIZE,
        y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );

      context.strokeStyle = '#1f2937';
      context.strokeRect(
        x * TILE_SIZE,
        y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }

  // Draw items
  for (const item of gameState.items) {
    drawText(item.symbol, item.x, item.y);
  }

  // Draw explosions
  for (const explosion of gameState.explosions) {
    context.fillStyle = 'rgba(250, 204, 21, 0.35)';
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
  for (const projectile of gameState.projectiles) {
    context.fillStyle = projectile.color;
    context.beginPath();

    context.arc(
      projectile.x * TILE_SIZE + TILE_SIZE / 2,
      projectile.y * TILE_SIZE + TILE_SIZE / 2,
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
  drawText(
    gameState.player.symbol,
    gameState.player.x,
    gameState.player.y
  );

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
    <p>Use Arrow Keys or WASD to move. Press Space to cast.</p>
  `;

  if (restartButton) {
    restartButton.style.display = gameState.gameOver
      ? 'inline-block'
      : 'none';
  }
}

window.addEventListener('keydown', event => {
  const movementKeys = {
    ArrowUp: [0, -1],
    w: [0, -1],
    W: [0, -1],

    ArrowDown: [0, 1],
    s: [0, 1],
    S: [0, 1],

    ArrowLeft: [-1, 0],
    a: [-1, 0],
    A: [-1, 0],

    ArrowRight: [1, 0],
    d: [1, 0],
    D: [1, 0],
  };

  if (movementKeys[event.key]) {
    event.preventDefault();

    const [dx, dy] = movementKeys[event.key];
    movePlayer(dx, dy);
  }

  if (event.key === ' ') {
    event.preventDefault();
    castSpell();
  }
});

if (restartButton) {
  restartButton.addEventListener('click', () => {
    initGame(1);
  });
}

initGame(1);

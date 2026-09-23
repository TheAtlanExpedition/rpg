"use strict";
const game2Canvas = document.getElementById("gameCanvas2");
const game2Context = game2Canvas.getContext("2d");
const gameInfo = document.getElementById("gameInfo");
const restartButton = document.getElementById("restartButton");
const TILE_SIZE = 32;
const MAP_WIDTH = 25;
const MAP_HEIGHT = 20;
game2Canvas.width = MAP_WIDTH * TILE_SIZE;
game2Canvas.height = MAP_HEIGHT * TILE_SIZE;
const WALL = 0;
const FLOOR = 1;
let game2Running = false;
let game2State = null;
let game2LevelTimer = null;
const game2Keys = {};
function createGame2State(level = 1) {
  const map = Array.from(
    { length: MAP_HEIGHT },
    () => Array(MAP_WIDTH).fill(WALL)
  );
  const rooms = [];
  for (let i = 0; i < 6; i++) {
    const width = Math.floor(Math.random() * 4) + 4;
    const height = Math.floor(Math.random() * 4) + 4;
    const x =
      Math.floor(Math.random() * (MAP_WIDTH - width - 2)) + 1;
    const y =
      Math.floor(Math.random() * (MAP_HEIGHT - height - 2)) + 1;
    for (let roomY = y; roomY < y + height; roomY++) {
      for (let roomX = x; roomX < x + width; roomX++) {
        map[roomY][roomX] = FLOOR;
      }
    }
    rooms.push({ x, y, width, height });
  }
  for (let i = 0; i < rooms.length - 1; i++) {
    const first = rooms[i];
    const second = rooms[i + 1];
    const firstX = Math.floor(first.x + first.width / 2);
    const firstY = Math.floor(first.y + first.height / 2);
    const secondX = Math.floor(second.x + second.width / 2);
    const secondY = Math.floor(second.y + second.height / 2);
    for (
      let x = Math.min(firstX, secondX);
      x <= Math.max(firstX, secondX);
      x++
    ) {
      map[firstY][x] = FLOOR;
    }
    for (
      let y = Math.min(firstY, secondY);
      y <= Math.max(firstY, secondY);
      y++
    ) {
      map[y][secondX] = FLOOR;
    }
  }
  const startRoom = rooms[0];
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
      symbol: Math.random() > 0.5 ? "👹" : "💀"
    });
  }
  const scrollRoom =
    rooms[Math.floor(Math.random() * (rooms.length - 1)) + 1];
  const potionRoom =
    rooms[Math.floor(Math.random() * (rooms.length - 1)) + 1];
  return {
    map,
    level,
    player: {
      x: startRoom.x + 1,
      y: startRoom.y + 1,
      hp: 100,
      maxHp: 100,
      symbol: "🧙‍♂️"
    },
    enemies,
    items: [
      {
        id: `scroll-${level}`,
        x: scrollRoom.x + 1,
        y: scrollRoom.y + 1,
        type: "scroll",
        symbol: "📜"
      },
      {
        id: `potion-${level}`,
        x: potionRoom.x + 2,
        y: potionRoom.y + 2,
        type: "potion",
        symbol: "🧪"
      }
    ],
    projectiles: [],
    explosions: [],
    scrolls: level === 1 ? 3 : 0,
    gameOver: false,
    message: "Find scrolls and defeat all monsters!"
  };
}
function startGame2() {
  clearTimeout(game2LevelTimer);
  if (!game2State || game2State.gameOver) {
    game2State = createGame2State(1);
  }
  game2Running = true;
  renderGame2();
}
function stopGame2() {
  game2Running = false;
  clearTimeout(game2LevelTimer);
  for (const key in game2Keys) {
    game2Keys[key] = false;
  }
  drawGame2PoweredOffScreen();
}
function restartGame2() {
  clearTimeout(game2LevelTimer);
  game2State = createGame2State(1);
  game2Running = true;
  renderGame2();
}
function movePlayer(dx, dy) {
  if (!game2Running || !game2State || game2State.gameOver) {
    return;
  }
  const newX = game2State.player.x + dx;
  const newY = game2State.player.y + dy;
  if (
    newX < 0 ||
    newX >= MAP_WIDTH ||
    newY < 0 ||
    newY >= MAP_HEIGHT ||
    game2State.map[newY][newX] === WALL
  ) {
    return;
  }
  const enemy = game2State.enemies.find(
    currentEnemy =>
      currentEnemy.x === newX &&
      currentEnemy.y === newY
  );
  if (enemy) {
    attackEnemy(enemy.id);
    return;
  }
  const item = game2State.items.find(
    currentItem =>
      currentItem.x === newX &&
      currentItem.y === newY
  );
  game2State.player.x = newX;
  game2State.player.y = newY;
  if (item) {
    game2State.items = game2State.items.filter(
      currentItem => currentItem.id !== item.id
    );
    if (item.type === "scroll") {
      game2State.scrolls += 3;
      game2State.message = "Picked up 3 magic scrolls!";
    }
    if (item.type === "potion") {
      game2State.player.hp = Math.min(
        game2State.player.maxHp,
        game2State.player.hp + 30
      );
      game2State.message = "Drank a health potion!";
    }
  } else {
    game2State.message = "Moving...";
  }
  moveEnemies();
  renderGame2();
}
function attackEnemy(enemyId) {
  if (!game2Running || !game2State || game2State.gameOver) {
    return;
  }
  const enemy = game2State.enemies.find(
    currentEnemy => currentEnemy.id === enemyId
  );
  if (!enemy) {
    return;
  }
  enemy.hp -= 15;
  game2State.message = "You struck the monster!";
  if (enemy.hp <= 0) {
    game2State.enemies = game2State.enemies.filter(
      currentEnemy => currentEnemy.id !== enemyId
    );
    game2State.message = "Monster defeated!";
  }
  if (game2State.enemies.length === 0) {
    game2State.message = "Level cleared!";
    renderGame2();
    game2LevelTimer = setTimeout(() => {
      if (game2Running) {
        game2State = createGame2State(game2State.level + 1);
        renderGame2();
      }
    }, 700);
    return;
  }
  moveEnemies();
  renderGame2();
}
function castSpell(dx = 0, dy = 0) {
  if (!game2Running || !game2State || game2State.gameOver) {
    return;
  }
  if (game2State.scrolls <= 0) {
    game2State.message = "You have no magic scrolls!";
    renderGame2();
    return;
  }

  // Default to right if no direction given (for safety)
  if (dx === 0 && dy === 0) {
    dx = 1;
  }

  game2State.scrolls--;

  let projectileX = game2State.player.x;
  let projectileY = game2State.player.y;
  let hitEnemy = null;

  // Travel up to 5 tiles in the chosen direction
  for (let i = 0; i < 5; i++) {
    projectileX += dx;
    projectileY += dy;

    // Stop at map edge
    if (
      projectileX < 0 || projectileX >= MAP_WIDTH ||
      projectileY < 0 || projectileY >= MAP_HEIGHT
    ) {
      break;
    }

    hitEnemy = game2State.enemies.find(
      enemy => enemy.x === projectileX && enemy.y === projectileY
    );
    if (hitEnemy) {
      break;
    }
  }

  if (hitEnemy) {
    hitEnemy.hp -= 20;
    game2State.message = "Magic bolt hit the monster!";
    if (hitEnemy.hp <= 0) {
      game2State.enemies = game2State.enemies.filter(
        enemy => enemy !== hitEnemy
      );
    }
  } else {
    game2State.message = "The magic bolt missed!";
  }

  moveEnemies();
  renderGame2();
}

document.addEventListener("keydown", event => {
  if (!game2Running) {
    return;
  }

  // WASD only for movement
  const movementKeys = {
    w: [0, -1],
    W: [0, -1],
    s: [0, 1],
    S: [0, 1],
    a: [-1, 0],
    A: [-1, 0],
    d: [1, 0],
    D: [1, 0]
  };

  if (movementKeys[event.key]) {
    event.preventDefault();
    const [dx, dy] = movementKeys[event.key];
    movePlayer(dx, dy);
    return;
  }

  // Arrow keys fire in that direction
  const fireKeys = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0]
  };

  if (fireKeys[event.key]) {
    event.preventDefault();
    const [dx, dy] = fireKeys[event.key];
    castSpell(dx, dy);
    return;
  }

  // Optional: keep Space as a quick fire (fires right)
  if (event.key === " ") {
    event.preventDefault();
    castSpell(1, 0);
  }
});
function moveEnemies() {
  if (!game2State || game2State.gameOver) {
    return;
  }
  for (const enemy of game2State.enemies) {
    const distance =
      Math.abs(enemy.x - game2State.player.x) +
      Math.abs(enemy.y - game2State.player.y);
    if (distance === 1) {
      game2State.player.hp -= 8;
      game2State.message = "The monster strikes!";
      continue;
    }
    if (distance > 5) {
      continue;
    }
    const possibleMoves = [
      {
        x: enemy.x + Math.sign(game2State.player.x - enemy.x),
        y: enemy.y
      },
      {
        x: enemy.x,
        y: enemy.y + Math.sign(game2State.player.y - enemy.y)
      }
    ];
    for (const move of possibleMoves) {
      const validMove =
        move.x >= 0 &&
        move.x < MAP_WIDTH &&
        move.y >= 0 &&
        move.y < MAP_HEIGHT &&
        game2State.map[move.y][move.x] === FLOOR &&
        !(
          move.x === game2State.player.x &&
          move.y === game2State.player.y
        );
      if (validMove) {
        enemy.x = move.x;
        enemy.y = move.y;
        break;
      }
    }
  }
  if (game2State.player.hp <= 0) {
    game2State.player.hp = 0;
    game2State.gameOver = true;
    game2State.message = "Game Over!";
  }
}
function drawText(symbol, x, y) {
  game2Context.font = `${TILE_SIZE - 4}px Arial`;
  game2Context.textAlign = "center";
  game2Context.textBaseline = "middle";
  game2Context.fillText(
    symbol,
    x * TILE_SIZE + TILE_SIZE / 2,
    y * TILE_SIZE + TILE_SIZE / 2
  );
}
function renderGame2() {
  if (!game2State) {
    return;
  }
  game2Context.clearRect(
    0,
    0,
    game2Canvas.width,
    game2Canvas.height
  );
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      game2Context.fillStyle =
        game2State.map[y][x] === WALL
          ? "#111827"
          : "#374151";
      game2Context.fillRect(
        x * TILE_SIZE,
        y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
      game2Context.strokeStyle = "#1f2937";
      game2Context.strokeRect(
        x * TILE_SIZE,
        y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }
  for (const item of game2State.items) {
    drawText(item.symbol, item.x, item.y);
  }
  for (const enemy of game2State.enemies) {
    drawText(enemy.symbol, enemy.x, enemy.y);
  }
  drawText(
    game2State.player.symbol,
    game2State.player.x,
    game2State.player.y
  );
  updateGameInfo();
}
function updateGameInfo() {
  if (!gameInfo || !game2State) {
    return;
  }
  gameInfo.innerHTML = `
    <p>
      ❤️ HP: ${game2State.player.hp}/${game2State.player.maxHp}
      &nbsp;|&nbsp;
      📜 Scrolls: ${game2State.scrolls}
      &nbsp;|&nbsp;
      Floor: ${game2State.level}
    </p>
    <p>${game2State.message}</p>
    <p>Use Arrow Keys or WASD to move. Press Space to cast.</p>
  `;
  restartButton.hidden = !game2State.gameOver;
}
function drawGame2PoweredOffScreen() {
  game2Context.fillStyle = "#111827";
  game2Context.fillRect(
    0,
    0,
    game2Canvas.width,
    game2Canvas.height
  );
  game2Context.fillStyle = "#9ca3af";
  game2Context.font = "24px Arial";
  game2Context.textAlign = "center";
  game2Context.textBaseline = "middle";
  game2Context.fillText(
    "Game 2 is powered off",
    game2Canvas.width / 2,
    game2Canvas.height / 2
  );
}
document.addEventListener("keydown", event => {
  if (!game2Running) {
    return;
  }
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
    D: [1, 0]
  };
  if (movementKeys[event.key]) {
    event.preventDefault();
    const [dx, dy] = movementKeys[event.key];
    movePlayer(dx, dy);
  }
  if (event.key === " ") {
    event.preventDefault();
    castSpell();
  }
});
restartButton.addEventListener("click", restartGame2);
window.startGame2 = startGame2;
window.stopGame2 = stopGame2;
game2State = createGame2State(1);
drawGame2PoweredOffScreen();

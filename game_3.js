"use strict";

// Game window creation
const TILE_SIZE = 32;
const MAP_WIDTH = 25;
const MAP_HEIGHT = 20;

const TileType = {
  WALL: 0,
  FLOOR: 1,
  DOOR: 2,
  TRAP: 3,
  SWITCH: 4,
};

// Player Sprites (Pre-load)
const PLAYER_SPRITES = {
  up: new Image(),
  down: new Image(),
  left: new Image(),
  right: new Image(),
};
const ITEM_SPRITES = {
  HealthPotion: new Image(),
  ScrollFireBall: new Image(),
  ScrollFreezeCloud: new Image(),
  ScrollChainLightning: new Image(),
};
// Sprite Location
PLAYER_SPRITES.up.src =
  "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/629309201c79312c67dcc68b68a563ea555df5c1/assets/sprites/characters/player/wizard-up.svg";
PLAYER_SPRITES.down.src =
  "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/629309201c79312c67dcc68b68a563ea555df5c1/assets/sprites/characters/player/wizard-down.svg";
PLAYER_SPRITES.left.src =
  "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/629309201c79312c67dcc68b68a563ea555df5c1/assets/sprites/characters/player/wizard-left.svg";
PLAYER_SPRITES.right.src =
  "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/629309201c79312c67dcc68b68a563ea555df5c1/assets/sprites/characters/player/wizard-right.svg";

ITEM_SPRITES.HealthPotion.src =
  "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/bb830fd6234e9dbabdefddcc4d706d9aa52b3fd7/assets/sprites/items/Potion-1.svg";
ITEM_SPRITES.ScrollFireBall.src =
  "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/d33f96247a1925eda50a0a743ef371486bc3949e/assets/sprites/items/Scroll-3.svg";
ITEM_SPRITES.ScrollFreezeCloud.src =
  "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/d33f96247a1925eda50a0a743ef371486bc3949e/assets/sprites/items/Scroll-1.svg";
ITEM_SPRITES.ScrollChainLightning.src =
  "https://raw.githubusercontent.com/TheAtlanExpedition/rpg/d33f96247a1925eda50a0a743ef371486bc3949e/assets/sprites/items/Scroll-2.svg";

// HTML canvas set up
const canvas = document.getElementById("gameCanvas3");
const context = canvas.getContext("2d");
const game3Info = document.getElementById("game3Info");
const restartButton = document.getElementById("game3restartButton");

canvas.width = MAP_WIDTH * TILE_SIZE;
canvas.height = MAP_HEIGHT * TILE_SIZE;

let gameRunning = false;
let gameStart = null;
let globalPlayer = null;
let gameState = null;

function startGame3() {
  gameStart = performance.now();
  gameRunning = true;
  gameState = createGameState(1, null, []);

  requestAnimationFrame(gameLoop);
}

function stopGame3() {
  gameRunning = false;
}

function gameLoop(timestamp) {
  if (!gameRunning) return;

  drawGame();

  requestAnimationFrame(gameLoop);
}

function drawGame() {
  if (!gameState) return;

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#222";
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawPlayer();
}

window.startGame3 = startGame3;
window.stopGame3 = stopGame3;

// Sprite generation to canvas
function drawPlayer() {
  if (!globalPlayer) return;

  const activeSprite = PLAYER_SPRITES[globalPlayer.direction];
  const pixelX = globalPlayer.x * TILE_SIZE;
  const pixelY = globalPlayer.y * TILE_SIZE;

  context.drawImage(activeSprite, pixelX, pixelY, TILE_SIZE, TILE_SIZE);
}

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

  // Traps
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    const trapCount = 4;
    for (let t = 0; t < trapCount; t++) {
      const trapX = Math.floor(Math.random() * (room.w - 2)) + room.x + 1;
      const trapY = Math.floor(Math.random() * (room.h - 2)) + room.y + 1;

      const roomCenterX = Math.floor(room.x + room.w / 2);
      const roomCenterY = Math.floor(room.y + room.h / 2);

      if (trapX !== roomCenterX || trapY !== roomCenterY) {
        newMap[trapY][trapX] = TileType.TRAP;
      }
    }
  }
  const startRoom = rooms[0];

  // Player creation
  const player = existingPlayer
    ? {
        ...existingPlayer,
        x: startRoom.x + 1,
        y: startRoom.y + 1,
        hp: Math.max(existingPlayer.hp, 1),
        direction: existingPlayer.direction || "down",
      }
    : {
        id: "player",
        x: startRoom.x + 1,
        y: startRoom.y + 1,
        hp: 100,
        maxHp: 100,
        type: "player",
        direction: "down",
        color: "#3b82f6",
      };

  globalPlayer = player;

  // Enemies
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
      color: "#ef4444",
    });
  }

  // Items
  const items = [];
  // Scrolls
  const possibleScrolls = [
    { idName: "ScrollFireBall", tag: "fb" },
    { idName: "ScrollFreezeCloud", tag: "fc" },
    { idName: "ScrollChainLightning", tag: "cl" },
  ];

  for (let i = 0; i < possibleScrolls.length; i++) {
    const scrollBlueprint = possibleScrolls[i];

    if (Math.random() > 0.5) {
      const scrollRoom =
        rooms[Math.floor(Math.random() * (rooms.length - 1)) + 1];

      items.push({
        id: `scroll-${level}-${scrollBlueprint.tag}`,
        x: scrollRoom.x + 1,
        y: scrollRoom.y + 1,
        type: "scroll",
        idName: scrollBlueprint.idName,
      });
    }
  }
  // Potions
  const potionRoom = rooms[Math.floor(Math.random() * (rooms.length - 1)) + 1];
  items.push({
    id: `potion-${level}-hp`,
    x: potionRoom.x + 2,
    y: potionRoom.y + 2,
    type: "potion",
    idName: "HealthPotion",
  });

  return {
    map: newMap,
    rooms: rooms,
    player: player,
    items: items,
    enemies: enemies,
  };
}

// Test
/* console.log("Game 3 JavaScript loaded");

const testCanvas = document.getElementById("gameCanvas3");
const testContext = testCanvas.getContext("2d");

testContext.fillStyle = "red";
testContext.fillRect(0, 0, 100, 100);

console.log("Canvas test drawn"); */

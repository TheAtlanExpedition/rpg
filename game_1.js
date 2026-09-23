"use strict";

const game1Canvas = document.getElementById("gameCanvas");
const game1Context = game1Canvas.getContext("2d");

let game1Running = false;
let game1AnimationFrame;

const TILE_SIZE = 32;
const MAP_WIDTH = 25;
const MAP_HEIGHT = 20;

const TileType = {
  WALL: 0,
  FLOOR: 1,
  DOOR: 2,
};

const game1Player = {
  x: 100,
  y: 400,
  width: 15,
  height: 15,
  speed: 1.5,
  color: "#ff3333",
};

const game1Keys = {};

document.addEventListener("keydown", (event) => {
  if (!game1Running) return;

  if (
    event.key === "ArrowUp" ||
    event.key === "ArrowDown" ||
    event.key === "ArrowLeft" ||
    event.key === "ArrowRight" ||
    event.key === " "
  ) {
    event.preventDefault();
  }
  game1Keys[event.key] = true;
});

document.addEventListener("keyup", (event) => {
  game1Keys[event.key] = false;
});

function updateGame1() {
  if (!game1Running) return;

  if (game1Keys.ArrowLeft || game1Keys.a || game1Keys.A) {
    game1Player.x -= game1Player.speed;
  }
  if (game1Keys.ArrowRight || game1Keys.d || game1Keys.D) {
    game1Player.x += game1Player.speed;
  }
  if (game1Keys.ArrowUp || game1Keys.w || game1Keys.W) {
    game1Player.y -= game1Player.speed;
  }
  if (game1Keys.ArrowDown || game1Keys.s || game1Keys.S) {
    game1Player.y += game1Player.speed;
  }

  game1Player.x = Math.max(
    0,
    Math.min(game1Canvas.width - game1Player.width, game1Player.x)
  );
  game1Player.y = Math.max(
    0,
    Math.min(game1Canvas.height - game1Player.height, game1Player.y)
  );
}

function drawGame1() {
  game1Context.clearRect(0, 0, game1Canvas.width, game1Canvas.height);

  game1Context.fillStyle = "#87ceeb";
  game1Context.fillRect(0, 0, game1Canvas.width, game1Canvas.height);

  game1Context.fillStyle = "#228b22";
  game1Context.fillRect(0, game1Canvas.height - 70, game1Canvas.width, 70);

  game1Context.fillStyle = game1Player.color;
  game1Context.fillRect(
    game1Player.x,
    game1Player.y,
    game1Player.width,
    game1Player.height
  );
}

function drawGame1PoweredOffScreen() {
  game1Context.fillStyle = "#111827";
  game1Context.fillRect(0, 0, game1Canvas.width, game1Canvas.height);
  game1Context.fillStyle = "#9ca3af";
  game1Context.font = "24px Arial";
  game1Context.textAlign = "center";
  game1Context.textBaseline = "middle";
  game1Context.fillText(
    "Game 1 is powered off",
    game1Canvas.width / 2,
    game1Canvas.height / 2
  );
}

function game1Loop() {
  if (game1Running) {
    updateGame1();
    drawGame1();
  }
  game1AnimationFrame = requestAnimationFrame(game1Loop);
}

function startGame1() {
  game1Running = true;
  drawGame1();
}

function stopGame1() {
  game1Running = false;
  for (const key in game1Keys) {
    game1Keys[key] = false;
  }
  drawGame1PoweredOffScreen();
}

window.startGame1 = startGame1;
window.stopGame1 = stopGame1;

drawGame1PoweredOffScreen();
game1Loop();

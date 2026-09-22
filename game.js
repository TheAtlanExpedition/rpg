let gameRunning = false;

const canvas = document.querySelector("#gameCanvas");
const context = canvas.getContext("2d");

const player = {
  x: 100,
  y: 400,
  width: 40,
  height: 40,
  speed: 5,
  color: "#ff3333"
};

const keys = {};

document.addEventListener("keydown", (event) => {
  keys[event.key] = true;
});

document.addEventListener("keyup", (event) => {
  keys[event.key] = false;
});

function updateGame() {
  if (keys["ArrowLeft"] || keys["a"]) {
    player.x -= player.speed;
  }

  if (keys["ArrowRight"] || keys["d"]) {
    player.x += player.speed;
  }

  if (keys["ArrowUp"] || keys["w"]) {
    player.y -= player.speed;
  }

  if (keys["ArrowDown"] || keys["s"]) {
    player.y += player.speed;
  }

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

function drawGame() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#87ceeb";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#228b22";
  context.fillRect(0, canvas.height - 70, canvas.width, 70);

  context.fillStyle = player.color;
  context.fillRect(
    player.x,
    player.y,
    player.width,
    player.height
  );
}

function gameLoop() {
  updateGame();
  drawGame();
  requestAnimationFrame(gameLoop);
}

gameLoop();

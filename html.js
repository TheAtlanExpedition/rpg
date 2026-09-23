/* ===== GAMES WINDOW CONTROL ===== */
const gameWindow = document.getElementById("gameWindow");
const poweredOffScreen = document.getElementById("poweredOffScreen");
const game1Button = document.getElementById("game1Button");
const game2Button = document.getElementById("game2Button");
const game3Button = document.getElementById("game3Button");
const gamePowerButton = document.getElementById("gamePowerButton");
const game1Container = document.getElementById("game1Container");
const game2Container = document.getElementById("game2Container");
const game3Container = document.getElementById("game3Container");

let selectedGame = 1;
let gamePoweredOn = false;

function updateGameWindow() {
  gameWindow.classList.toggle("powered-on", gamePoweredOn);
  gameWindow.classList.toggle("powered-off", !gamePoweredOn);

  poweredOffScreen.hidden = gamePoweredOn;
  game1Container.hidden = !gamePoweredOn || selectedGame !== 1;
  game2Container.hidden = !gamePoweredOn || selectedGame !== 2;
  game3Container.hidden = !gamePoweredOn || selectedGame !== 3;

  game1Button.classList.toggle(
    "selected-game",
    gamePoweredOn && selectedGame === 1
  );
  game2Button.classList.toggle(
    "selected-game",
    gamePoweredOn && selectedGame === 2
  );
  game3Button.classList.toggle(
    "selected-game",
    gamePoweredOn && selectedGame === 3
  );

  gamePowerButton.setAttribute("aria-pressed", String(gamePoweredOn));
}

function stopSelectedGame() {
  if (selectedGame === 1 && window.stopGame1) {
    window.stopGame1();
  }
  if (selectedGame === 2 && window.stopGame2) {
    window.stopGame2();
  }
  if (selectedGame === 3 && window.stopGame3) {
    window.stopGame3();
  }
}

function startSelectedGame() {
  if (selectedGame === 1 && window.startGame1) {
    window.startGame1();
  }
  if (selectedGame === 2 && window.startGame2) {
    window.startGame2();
  }
  if (selectedGame === 3 && window.startGame3) {
    window.startGame3();
  }
}

function selectGame(gameNumber) {
  if (gamePoweredOn) {
    stopSelectedGame();
  }
  selectedGame = gameNumber;
  gamePoweredOn = true;
  updateGameWindow();
  startSelectedGame();
}

function togglePower() {
  if (gamePoweredOn) {
    stopSelectedGame();
    gamePoweredOn = false;
  } else {
    gamePoweredOn = true;
    startSelectedGame();
  }
  updateGameWindow();
}

game1Button.addEventListener("click", () => selectGame(1));
game2Button.addEventListener("click", () => selectGame(2));
game3Button.addEventListener("click", () => selectGame(3));
gamePowerButton.addEventListener("click", togglePower);

updateGameWindow();

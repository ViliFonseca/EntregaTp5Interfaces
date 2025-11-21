document.addEventListener("DOMContentLoaded", () => {
  const playButton = document.getElementById("playButton");
  const gameOverlay = document.getElementById("gameOverlay");
  const gameScreen = document.querySelector(".game-screen");
  const gameContainer = document.getElementById("game-container-dom");
  const gamePreviewImage = document.getElementById("gamePreviewImage");
  const scoreDisplay = document.getElementById("score-display"); 

  if (!gameContainer) return;
  const calvo = document.getElementById("calvo");
  const piso = document.getElementById("piso");

  const gravity = 0.5;
  const jump = -8;
  const calvoX = 100;
  const hitboxPadding = 30;

  let calvoY, velocity, gameLoopId;
  let gameRunning = false;
  let score = 0;

  let calvoWidth;
  let calvoHeight;

  // Pipes y Monedas
  const pipeWidth = 60;
  let pipespeed = 4;
  const pipes = [];
  const coins = [];

  playButton.addEventListener("click", startGame);

  // ====================================================
  //  PARALLAX DINÁMICO
  // ====================================================
  const parallaxLayers = [
    { id: "bg-sky", speed: 0.10 },
    { id: "bg-mountains", speed: 0.25 },
    { id: "bg-clouds", speed: 0.45 },
    { id: "bg-forest-front", speed: 0.75 }
  ];

  function updateParallax() {
    parallaxLayers.forEach(layer => {
      const el = document.getElementById(layer.id);
      if (!el || el.dataset.paused === "true") return;
      let pos = parseFloat(el.dataset.pos || "0");
      pos -= pipespeed * layer.speed; 
      el.dataset.pos = pos;
      el.style.backgroundPosition = `${pos}px 0px`;
    });
  }

  function pauseParallax() {
    document.querySelectorAll(".layer").forEach(layer => layer.dataset.paused = "true");
  }

  function resumeParallax() {
    document.querySelectorAll(".layer").forEach(layer => layer.dataset.paused = "false");
  }

  // ====================================================
  //                   INICIO DEL JUEGO
  // ====================================================

  function startGame() {
    gameOverlay.style.display = "none";
    if (gamePreviewImage) gamePreviewImage.style.display = "none";
    gameContainer.style.display = "block";
    scoreDisplay.style.display = "block";

    calvoWidth = calvo.clientWidth;
    calvoHeight = calvo.clientHeight;

    // Reiniciar variables
    calvoY = 150;
    velocity = 0;
    score = 0;
    updateScoreUI();

    calvo.style.top = calvoY + "px";
    calvo.style.transform = "scaleX(-1) rotate(0deg)";
    calvo.classList.remove("flap");
    calvo.classList.remove("dead");

    piso.style.animationPlayState = "running";

    // Reset parallax
    document.querySelectorAll(".layer").forEach(l => {
      l.dataset.pos = "0";
      l.style.backgroundPosition = "0px 0px";
    });
    resumeParallax();

    // Limpiar tuberías anteriores
    pipes.forEach(pipe => {
      if(pipe.topPipe.parentNode) pipe.topPipe.remove();
      if(pipe.bottomPipe.parentNode) pipe.bottomPipe.remove();
    });
    pipes.length = 0;

    // Limpiar monedas anteriores
    coins.forEach(coin => {
      if(coin.el.parentNode) coin.el.remove();
    });
    coins.length = 0;

    gameRunning = true;

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoop();
  }

  // ====================================================
  //                     GAME LOOP
  // ====================================================

  function gameLoop() {
    if (!gameRunning) return;

    // Física
    velocity += gravity;
    calvoY += velocity;

    const gameHeight = gameScreen.clientHeight;
    const pisoHeight = piso.clientHeight;
    const floorLimit = gameHeight - pisoHeight - calvoHeight;

    if (calvoY > floorLimit) {
      calvoY = floorLimit;
      muertePelado();
      return;
    }

    if (calvoY < 0) { // Techo
      calvoY = 0;
      velocity = 0;
    }

    // Movimiento de Entidades
    movePipes();
    moveCoins();

    // Parallax
    updateParallax();

    // Render
    calvo.style.top = calvoY + "px";

    gameLoopId = requestAnimationFrame(gameLoop);
  }

  // ====================================================
  //                GENERADOR DE OBSTÁCULOS
  // ====================================================

  function createObstacle() {
    if (!gameRunning) return;

    const pipeGap = 170; // Espacio entre tuberías
    const gameHeight = gameScreen.clientHeight;
    const pisoHeight = piso.clientHeight;

    const minHeight = 50;
    const maxHeight = gameHeight - pisoHeight - pipeGap - minHeight;
    const pipeTopHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

    const bottomPipeTop = pipeTopHeight + pipeGap;
    const bottomPipeHeight = gameHeight - bottomPipeTop - pisoHeight;

    // Crear Tubería Superior
    const topPipe = document.createElement("img");
    topPipe.src = "img/Flappy/pipe-top.png";
    topPipe.classList.add("pipe", "top");
    topPipe.style.height = pipeTopHeight + "px";
    topPipe.style.left = gameContainer.clientWidth + "px";
    topPipe.style.width = pipeWidth + "px";

    // Crear Tubería Inferior
    const bottomPipe = document.createElement("img");
    bottomPipe.src = "img/Flappy/pipe-bottom.png";
    bottomPipe.classList.add("pipe", "bottom");
    bottomPipe.style.top = bottomPipeTop + "px";
    bottomPipe.style.height = bottomPipeHeight + "px";
    bottomPipe.style.left = gameContainer.clientWidth + "px";
    bottomPipe.style.width = pipeWidth + "px";

    gameContainer.appendChild(topPipe);
    gameContainer.appendChild(bottomPipe);

    pipes.push({ 
      topPipe, 
      bottomPipe, 
      x: gameContainer.clientWidth, 
      pipeTopHeight,
      pipeGap,
      passed: false 
    });

    // === LÓGICA DE CREACIÓN DE MONEDAS ===
    if (Math.random() > 0.8) {
      createCoin(gameContainer.clientWidth + (pipeWidth / 2) - 16, pipeTopHeight + (pipeGap / 2) - 16);
    }
  }

  function createCoin(x, y) {
    const coinEl = document.createElement("div");
    coinEl.classList.add("coin");
    coinEl.style.left = x + "px";
    coinEl.style.top = y + "px";
    
    gameContainer.appendChild(coinEl);
    
    coins.push({
      el: coinEl,
      x: x,
      y: y,
      collected: false,
      width: 32,
      height: 32
    });
  }

  // ====================================================
  //                MOVIMIENTO Y LÓGICA
  // ====================================================

  function movePipes() {
    for (let i = 0; i < pipes.length; i++) {
      const pipe = pipes[i];
      pipe.x -= pipespeed;
      pipe.topPipe.style.left = pipe.x + "px";
      pipe.bottomPipe.style.left = pipe.x + "px";

      // Detectar si pasamos la tubería para sumar punto
      if (!pipe.passed && (pipe.x + pipeWidth) < calvoX) {
        score += 1; // 1 punto por pasar tubería
        pipe.passed = true;
        updateScoreUI();
      }

      // Eliminar si sale de pantalla
      if (pipe.x < -pipeWidth) {
        pipe.topPipe.remove();
        pipe.bottomPipe.remove();
        pipes.splice(i, 1);
        i--;
      } else if (collisionDetected(pipe)) {
        muertePelado();
      }
    }
  }

  function moveCoins() {
    for (let i = 0; i < coins.length; i++) {
      const coin = coins[i];
      
      if (coin.collected) continue;

      coin.x -= pipespeed;
      coin.el.style.left = coin.x + "px";

      if (checkCoinCollision(coin)) {
        collectCoin(coin);
      }
      if (coin.x < -50) {
        coin.el.remove();
        coins.splice(i, 1);
        i--;
      }
    }
  }

  function updateScoreUI() {
    scoreDisplay.innerText = score;
  }

  function collectCoin(coin) {
    coin.collected = true;
    coin.el.remove(); 
    score += 5; 
    updateScoreUI();
  }

  // ====================================================
  //                     COLISIONES
  // ====================================================

  function collisionDetected(pipe) {
    const calvoTop = calvoY + hitboxPadding;
    const calvoBottom = calvoY + calvoHeight - hitboxPadding;
    const calvoLeft = calvoX + hitboxPadding;
    const calvoRight = calvoX + calvoWidth - hitboxPadding;

    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + pipeWidth;
    const topPipeBottom = pipe.pipeTopHeight;
    const bottomPipeTop = pipe.pipeTopHeight + pipe.pipeGap;

    if (calvoRight > pipeLeft && calvoLeft < pipeRight) {
      if (calvoTop < topPipeBottom || calvoBottom > bottomPipeTop) {
        return true;
      }
    }
    return false;
  }

  function checkCoinCollision(coin) {
    // Hitbox del personaje
    const pL = calvoX;
    const pR = calvoX + calvoWidth;
    const pT = calvoY;
    const pB = calvoY + calvoHeight;

    // Hitbox de la moneda
    const cL = coin.x;
    const cR = coin.x + coin.width;
    const cT = coin.y;
    const cB = coin.y + coin.height;
    return (pL < cR && pR > cL && pT < cB && pB > cT);
  }

  // ====================================================
  //                       MUERTE
  // ====================================================

  function muertePelado() {
    if (!gameRunning) return;

    gameRunning = false;
    if (gameLoopId) cancelAnimationFrame(gameLoopId);

    calvo.classList.add("dead");
    piso.style.animationPlayState = "paused";
    pauseParallax();
    velocity = 0;
  }

  // Salto
  document.addEventListener("click", (e) => {
    if (gameRunning && e.target.tagName !== "BUTTON") {
      velocity = jump;
      if (!calvo.classList.contains("flap")) {
        calvo.classList.add("flap");
        setTimeout(() => calvo.classList.remove("flap"), 300);
      }
    }
  });

  // Loop para crear obstáculos
  setInterval(() => {
    if (gameRunning) createObstacle();
  }, 2000);

});
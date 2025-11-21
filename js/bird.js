document.addEventListener("DOMContentLoaded", () => {
  
  // Elementos de la UI de la página
  const playButton = document.getElementById("playButton");
  const gameOverlay = document.getElementById("gameOverlay");
  const gameScreen = document.querySelector(".game-screen");
  const gamePreviewImage = document.getElementById("gamePreviewImage");

  // Elementos del juego (DOM)
  const gameContainer = document.getElementById("game-container-dom");
  if (!gameContainer) return; 
  const fondo = document.getElementById("fondo");
  const calvo = document.getElementById("calvo");
  const piso = document.getElementById("piso");

  const gravity = 0.5;
  const jump = -8;
  const calvoX = 100;
  const hitboxPadding = 25;
  const pipeWidth = 40;
  let calvoY, velocity, gameLoopId;
  let gameRunning = false;
  let pipespeed = 4;
  const pipes = [];
  // Estas variables deben ser accesibles por MÚLTIPLES funciones.
  // Este era el error que rompía tu juego.
  let calvoWidth;
  let calvoHeight;
  playButton.addEventListener("click", startGame);

 function startGame() {
    gameOverlay.style.display = "none";
    if (gamePreviewImage) gamePreviewImage.style.display = "none";

    gameContainer.style.display = "block";
    calvoWidth = calvo.clientWidth;
    calvoHeight = calvo.clientHeight;

    calvoY = 150;
    velocity = 0;
    calvo.style.top = calvoY + "px";
    calvo.classList.remove("flap");
    calvo.style.transform = 'scaleX(-1) rotate(0deg)'; 
    calvo.style.animation = ''; 
    piso.style.animationPlayState = 'running';
    fondo.style.animationPlayState = 'running';
    pipes.forEach(pipe => {
        gameContainer.removeChild(pipe.topPipe);
        gameContainer.removeChild(pipe.bottomPipe);
    });
    pipes.length = 0;

    gameRunning = true;
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoop();
}


  function gameLoop() {
    if (!gameRunning) return;
    
    // 1. Aplicar física
    velocity += gravity;
    calvoY += velocity;
    
    // 2. Lógica de límites
    const gameHeight = gameScreen.clientHeight;
    const pisoHeight = piso.clientHeight;
    
    // Límite suelo (usa calvoHeight)
    const floorLimit = gameHeight - pisoHeight - calvoHeight;
    if (calvoY > floorLimit) {
      calvoY = floorLimit;
      muertePelado();
     return; // Detiene el loop
    }
    
    // Límite techo
    if (calvoY < 0) {
      calvoY = 0;
      velocity = 0;
    }
    movePipes();
  
    calvo.style.top = calvoY + "px";
    
    // 5. Continuar el loop
    gameLoopId = requestAnimationFrame(gameLoop);
  }


  function createObstacle() {
    if (!gameRunning) return; 

    const pipeGap = 160;
    const gameHeight = gameScreen.clientHeight;
    const pisoHeight = piso.clientHeight;
    
    const minHeight = 50;
    const maxHeight = gameHeight - pisoHeight - pipeGap - minHeight;
    const pipeTopHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
    
    const bottomPipeTop = pipeTopHeight + pipeGap;
    const bottomPipeHeight = gameHeight - bottomPipeTop - pisoHeight;

    const topPipe = document.createElement("img");
    topPipe.src = "img/Flappy/pipe-top.png";
    topPipe.classList.add("pipe", "top");
    topPipe.style.height = pipeTopHeight + "px";
    topPipe.style.left = gameContainer.clientWidth + "px"; 
    topPipe.style.width = pipeWidth + "px"; 

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
            pipeTopHeight: pipeTopHeight,
            pipeGap: pipeGap
        });
  }

    function movePipes() {
      for (let i = 0; i < pipes.length; i++) {
       const pipe = pipes[i];
       pipe.x -= pipespeed;
       pipe.topPipe.style.left = pipe.x + "px";
       pipe.bottomPipe.style.left = pipe.x + "px";

       if (pipe.x < -pipeWidth) { 
        gameContainer.removeChild(pipe.topPipe);
        gameContainer.removeChild(pipe.bottomPipe);
        pipes.splice(i, 1);
        i--;
       } else {
         if(collisionDetected(pipe)) {
          muertePelado();
         }
       }
      }
    }

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
      if (calvoTop < topPipeBottom) {
        return true;
      }
      if (calvoBottom > bottomPipeTop) {
        return true;
      }
    }
    return false;
  }

  // Intervalo para crear tuberías
  setInterval(() => {
      if (gameRunning) {
       createObstacle();
      }}, 2000);


function muertePelado() {
    if (!gameRunning) return;
    velocity = 0;
    gameRunning = false;

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    calvo.classList.remove("flap"); 
    piso.style.animationPlayState = 'paused';
    fondo.style.animationPlayState = 'paused';
}
  document.addEventListener("click", (e) => {
    if (gameRunning && e.target !== playButton && !playButton.contains(e.target)) {
      velocity = jump;
      if (!calvo.classList.contains('flap')) {
        calvo.classList.add("flap");
        setTimeout(() => {
            calvo.classList.remove("flap");
        }, 300); 
      }
    }
  });

});
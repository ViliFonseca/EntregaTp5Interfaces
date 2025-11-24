// =========================================
// CAMBIOS DE PANTALLA
// =========================================

function switchScreens(hideElement, showElement, duration = 300) {
    hideElement.style.opacity = "0";
    setTimeout(() => {
        hideElement.style.display = "none";
        showElement.style.display = "flex"; 
        showElement.style.opacity = "1";
    }, duration);
}

// =========================================
// INICIALIZACIÓN Y EVENTOS DOM
// =========================================

document.addEventListener("DOMContentLoaded", () => {
    // --- Referencias DOM ---
    const playButton = document.getElementById("playButton");
    const startGameBtn = document.getElementById("startGameBtn");
    const howToPlayBtn = document.getElementById("howToPlayBtn");
    const closeHowToPlay = document.getElementById("closeHowToPlay");
    
    // Referencias para el GAME OVER
    const endMenu = document.getElementById("endMenu");
    const endMessage = document.getElementById("endMessage");
    const restartGameBtn = document.getElementById("restartGameBtn");

    const overlay = document.getElementById("gameOverlay");
    const startMenu = document.getElementById("startMenu");
    const howToPlay = document.getElementById("howToPlay");
    const gameContainer = document.getElementById("game-container-dom");
    const previewImage = document.getElementById("gamePreviewImage");
    const scoreDisplay = document.getElementById("score-display"); 

    // - FLUJO DE MENÚS -
    if(playButton) {
        playButton.addEventListener("click", () => {
            if (previewImage) previewImage.style.display = "none";
            switchScreens(overlay, startMenu, 300);
        });
    }
    if(startGameBtn) {
        startGameBtn.addEventListener("click", () => {
            startMenu.style.opacity = "0";
            setTimeout(() => {
                startMenu.style.display = "none";
                gameContainer.style.display = "block"; 
                gameContainer.style.opacity = "1";
                scoreDisplay.style.display = "block";
                
                initGameLogic(); 
            }, 300);
        });
    }

    // Botón Reintentar (Del menú de derrota)
    if(restartGameBtn) {
        restartGameBtn.addEventListener("click", () => {
            // Ocultamos el menú de derrota
            endMenu.style.opacity = "0";
            setTimeout(() => {
                endMenu.style.display = "none";
                // Aseguramos que el contenedor del juego esté visible
                gameContainer.style.display = "block"; 
                scoreDisplay.style.display = "block";
                // Reiniciamos la lógica
                initGameLogic();
            }, 300);
        });
    }

    // ---BOTONES "CÓMO JUGAR" ---
    if(howToPlayBtn) {
        howToPlayBtn.addEventListener("click", () => {
            howToPlay.style.display = "flex";
        });
    }
    
    if(closeHowToPlay) {
        closeHowToPlay.addEventListener("click", () => {
            howToPlay.style.display = "none";
        });
    }

    // --- CONFIGURACIÓN INICIAL JUEGO ---
    const calvo = document.getElementById("calvo");
    const piso = document.getElementById("piso");
    // Físicas y estado
    const gravity = 0.5;
    const jump = -8;
    const hitboxPadding = 10;
    let calvoY, velocity, gameLoopId, obstacleInterval;
    let gameRunning = false;
    let score = 0;
    let calvoWidth = 50; 
    let calvoHeight = 50;
    const calvoX = 100; 

    // Pipes y Monedas
    const pipeWidth = 60;
    let pipespeed = 4;
    const pipes = [];
    const coins = [];

    // Salto (Click o Tecla)
    const jumpAction = (e) => {
        if (e.target.tagName === "BUTTON" || e.target.closest("button")) return; 
        
        if (gameRunning) {
            velocity = jump;
            if (!calvo.classList.contains("flap")) {
                calvo.classList.add("flap");
                setTimeout(() => calvo.classList.remove("flap"), 300);
            }
        }
    };
    
    gameContainer.addEventListener("mousedown", jumpAction);
    document.addEventListener("keydown", (e) => {
        if (e.code === "Space" || e.code === "ArrowUp") {
            e.preventDefault();
            jumpAction(e);
        }
    });

    // ====================
    //   LÓGICA DEL JUEGO
    // ====================

    function initGameLogic() {
        if(calvo) {
            calvoWidth = calvo.clientWidth;
            calvoHeight = calvo.clientHeight;
        }

        // Limpieza Profunda: Eliminar elementos del DOM primero
        pipes.forEach(pipe => {
            if(pipe.topPipe.parentNode) pipe.topPipe.remove();
            if(pipe.bottomPipe.parentNode) pipe.bottomPipe.remove();
        });
        coins.forEach(coin => {
            if(coin.el.parentNode) coin.el.remove();
        });

        // Vaciar Arrays
        pipes.length = 0;
        coins.length = 0;

        // Reiniciar variables
        calvoY = 150;
        velocity = 0;
        score = 0;
        updateScoreUI();

        // Reiniciar estilos del personaje
        calvo.style.top = calvoY + "px";
        calvo.style.transform = "scaleX(-1) rotate(0deg)";
        calvo.classList.remove("flap");
        calvo.classList.remove("dead");

        piso.style.animationPlayState = "running";

        // Reset parallax
        document.querySelectorAll(".layer").forEach(l => {
            l.dataset.pos = "0";
            l.style.backgroundPosition = "0px 0px";
            l.dataset.paused = "false"; // Asegurar que no estén pausados
        });

        gameRunning = true;

        // Asegurar que no haya loops previos corriendo
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        if (obstacleInterval) clearInterval(obstacleInterval);

        gameLoop();
        startObstacleGenerator();
    }

    function startObstacleGenerator() {
        if (obstacleInterval) clearInterval(obstacleInterval);
        obstacleInterval = setInterval(() => {
            if (gameRunning) createObstacle();
        }, 2000);
    }

    // ================
    //  PARALLAX
    // ================
 // En bird.js

const parallaxLayers = [
    // EJEMPLO: Si cielo.png mide 800 ancho x 400 alto:
    { id: "bg-sky", speed: 0.10, width: 576, height: 324 }, 
    
    // EJEMPLO: Si montana.png mide 1200 ancho x 600 alto:
    { id: "bg-mountains", speed: 0.25, width: 576, height: 324},
    
    // Haz lo mismo con las otras capas...
    { id: "bg-clouds", speed: 0.45, width: 576, height: 324 }, 
    { id: "bg-forest-front", speed: 0.75, width: 576, height: 324 }
];

  function updateParallax() {
    // Obtenemos la altura actual de la ventana del juego
    const gameHeight = gameContainer.clientHeight; 

    parallaxLayers.forEach(layer => {
        const el = document.getElementById(layer.id);
        if (!el || el.dataset.paused === "true") return;
        const ratio = layer.width / layer.height;
        const renderedWidth = gameHeight * ratio;
        let pos = parseFloat(el.dataset.pos || "0");
        pos -= pipespeed * layer.speed; 
        if (pos <= -renderedWidth) {
            pos += renderedWidth; 
        }

        el.dataset.pos = pos;
        el.style.backgroundPosition = `${pos}px 0px`;
    });
    }
    function pauseParallax() {
        document.querySelectorAll(".layer").forEach(layer => layer.dataset.paused = "true");
    }

    // ================
    //      GAME LOOP
    // ================
    function gameLoop() {
        if (!gameRunning) return;
        velocity += gravity;
        calvoY += velocity;

        const gameHeight = gameContainer.clientHeight;
        const pisoHeight = piso.clientHeight;
        const floorLimit = gameHeight - pisoHeight - calvoHeight + 10; 

        // Colisión Suelo
        if (calvoY > floorLimit) {
            calvoY = floorLimit;
            muertePelado();
            return;
        }
        if (calvoY < 0) { 
            calvoY = 0;
            velocity = 0;
        }

        movePipes();
        moveCoins();
        updateParallax();

        calvo.style.top = calvoY + "px";
        gameLoopId = requestAnimationFrame(gameLoop);
    }
    // ==============================
    //      GENERADOR DE OBSTÁCULOS
    // ==============================
   function createObstacle() {
    if (!gameRunning) return;
    const pipeWidth = 50;
    const spikeHeadHeight = 50; 
    const minBodyHeight = 20; 
    const minHeight = spikeHeadHeight + minBodyHeight; 
    const pipeGap = 300; 
    const gameHeight = gameContainer.clientHeight;
    const pisoHeight = piso.clientHeight;
    const maxTopHeight = gameHeight - pisoHeight - pipeGap - minHeight;
    if (maxTopHeight < minHeight) return;
    const pipeTopHeight = Math.floor(Math.random() * (maxTopHeight - minHeight + 1)) + minHeight;
    const bottomPipeTop = pipeTopHeight + pipeGap;
    const bottomPipeHeight = gameHeight - bottomPipeTop - pisoHeight;

    // ===========================================
    // CREAR Punta
    // ===========================================
    const topContainer = document.createElement("div");
    topContainer.classList.add("pipe-container");
    topContainer.style.height = pipeTopHeight + "px";
    topContainer.style.left = gameContainer.clientWidth + "px";
    topContainer.style.top = "0px";

    // Crear Cuerpo (Madera)
    const topBody = document.createElement("div");
    topBody.classList.add("pipe-body");
    
    // Crear Punta (Spike)
    const topHead = document.createElement("img");
    topHead.src = "img/Flappy/spike.png"; 
    topHead.classList.add("pipe-head");
    topContainer.appendChild(topBody);
    topContainer.appendChild(topHead);


    // ===========================================
    // crear obstaculo
    // ===========================================
    const bottomContainer = document.createElement("div");
    bottomContainer.classList.add("pipe-container");
    bottomContainer.style.height = bottomPipeHeight + "px";
    bottomContainer.style.left = gameContainer.clientWidth + "px";
    bottomContainer.style.top = bottomPipeTop + "px";

    // Crear Punta 
    const bottomHead = document.createElement("img");
    bottomHead.src = "img/Flappy/spike_down.png"; // Tu imagen actual
    bottomHead.classList.add("pipe-head");

    // Crear Cuerpo (Madera)
    const bottomBody = document.createElement("div");
    bottomBody.classList.add("pipe-body");

    // Ensamblar Abajo (Primero punta, luego madera )
    bottomContainer.appendChild(bottomHead);
    bottomContainer.appendChild(bottomBody);


    // ===========================================
    // 3. AGREGAR AL JUEGO Y AL ARRAY
    // ===========================================
    gameContainer.appendChild(topContainer);
    gameContainer.appendChild(bottomContainer);

    pipes.push({ 
        topPipe: topContainer,      
        bottomPipe: bottomContainer,
        x: gameContainer.clientWidth, 
        pipeTopHeight: pipeTopHeight,
        pipeGap: pipeGap,
        passed: false 
    });

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
        coins.push({ el: coinEl, x: x, y: y, collected: false, width: 32, height: 32 });
    }

    // ====================================================
    //  MOVIMIENTO Y COLISIONES
    // ====================================================
    function movePipes() {
        for (let i = 0; i < pipes.length; i++) {
            const pipe = pipes[i];
            pipe.x -= pipespeed;
            pipe.topPipe.style.left = pipe.x + "px";
            pipe.bottomPipe.style.left = pipe.x + "px";
            if (!pipe.passed && (pipe.x + pipeWidth) < calvoX) {
                score += 1; 
                pipe.passed = true;
                updateScoreUI();
            }
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
        if(scoreDisplay) scoreDisplay.innerText = score;
    }

    function collectCoin(coin) {
        coin.collected = true;
        coin.el.remove(); 
        score += 5; 
        updateScoreUI();
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
            if (calvoTop < topPipeBottom || calvoBottom > bottomPipeTop) {
                return true;
            }
        }
        return false;
    }

    function checkCoinCollision(coin) {
        const pL = calvoX;
        const pR = calvoX + calvoWidth;
        const pT = calvoY;
        const pB = calvoY + calvoHeight;

        const cL = coin.x;
        const cR = coin.x + coin.width;
        const cT = coin.y;
        const cB = coin.y + coin.height;
        return (pL < cR && pR > cL && pT < cB && pB > cT);
    }

    // ====================================================
    //  MUERTE Y FINAL
    // ====================================================
  function muertePelado() {
    if (!gameRunning) return;
    gameRunning = false;
    
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    if (obstacleInterval) clearInterval(obstacleInterval);
    
    calvo.classList.add("dead");
    piso.style.animationPlayState = "paused";
    pauseParallax();
    
    // Esperamos 1 segundo antes de mostrar el menú
    setTimeout(() => {
        showEndMenu();
    }, 1000); 
}

    function showEndMenu() {
        if(endMessage) endMessage.innerText = `Hiciste un total de ${score} puntos`;
        if(scoreDisplay) scoreDisplay.style.display = "none";
        
        if(endMenu) {
            endMenu.style.display = "flex";
            setTimeout(() => {
                endMenu.style.opacity = "1";
            }, 10);
        }
    }

}); 
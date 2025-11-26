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

function showShare() {
    const shareContainer = document.getElementById("shareContainer");
    shareContainer.style.display = shareContainer.style.display === "flex" ? "none" : "flex";
}

function fullscreen() {
    const gameScreen = document.querySelector(".game-screen");
    if (!document.fullscreenElement) {
        gameScreen.requestFullscreen()
            .catch(err => console.log(`Error al entrar en fullscreen: ${err.message}`));
    } else {
        document.exitFullscreen();
    }
}

function activarCorazonToggle(selector) {
    const btn = document.querySelector(selector);
    btn.addEventListener('click', () => {
        btn.classList.toggle('liked');
        if (btn.classList.contains('liked')) {
            btn.classList.add('animate');
            setTimeout(() => btn.classList.remove('animate'), 400);
        }
    });
}

// =========================================
// INICIALIZACIÓN Y EVENTOS DOM
// =========================================

document.addEventListener("DOMContentLoaded", () => {

    activarCorazonToggle('#likeBtn');

    // --- Referencias DOM ---
    const playButton = document.getElementById("playButton");
    const startGameBtn = document.getElementById("startGameBtn");
    const howToPlayBtn = document.getElementById("howToPlayBtn");
    const closeHowToPlay = document.getElementById("closeHowToPlay");

    const endMenu = document.getElementById("endMenu");
    const endMessage = document.getElementById("endMessage");
    const restartGameBtn = document.getElementById("restartGameBtn");

    const overlay = document.getElementById("gameOverlay");
    const startMenu = document.getElementById("startMenu");
    const howToPlay = document.getElementById("howToPlay");
    const gameContainer = document.getElementById("game-container-dom");
    const previewImage = document.getElementById("gamePreviewImage");
    const scoreDisplay = document.getElementById("score-display");

    // BOTONES SHARE Y FULLSCREEN
    const shareBtn = document.getElementById("shareBtn");
    const closeShare = document.getElementById("closeShare");
    shareBtn.addEventListener("click", showShare);
    closeShare.addEventListener("click", () => {
        document.getElementById("shareContainer").style.display = "none";
    });

    const fullscreenBtn = document.getElementById("fullscreenBtn");
    fullscreenBtn.addEventListener("click", fullscreen);

    document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement) {
            const gameScreen = document.querySelector(".game-screen");
            gameScreen.style.width = "1080px";
            gameScreen.style.height = "607px";
            gameScreen.style.maxWidth = "1080px";
            gameScreen.style.maxHeight = "607px";
        }
    });

    // ---------- FLUJO DE MENÚS ----------
    if (playButton) {
        playButton.addEventListener("click", () => {
            if (previewImage) previewImage.style.display = "none";
            switchScreens(overlay, startMenu, 300);
        });
    }

    if (startGameBtn) {
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

    if (restartGameBtn) {
        restartGameBtn.addEventListener("click", () => {
             // Ocultamos el menú de derrota
            endMenu.style.opacity = "0";
            setTimeout(() => {
                endMenu.style.display = "none";
                gameContainer.style.display = "block";
                scoreDisplay.style.display = "block";

                initGameLogic();
            }, 300);
        });
    }

    if (howToPlayBtn) {
        howToPlayBtn.addEventListener("click", () => {
            howToPlay.style.display = "flex";
        });
    }

    if (closeHowToPlay) {
        closeHowToPlay.addEventListener("click", () => {
            howToPlay.style.display = "none";
        });
    }

    // ---------- VARIABLES DEL JUEGO ----------
    const calvo = document.getElementById("calvo");
    const piso = document.getElementById("piso");

    const gravity = 0.5;
    const jump = -8;
    const hitboxPadding = 10;

    let calvoY, velocity, gameLoopId, obstacleInterval;
    let gameRunning = false;
    let score = 0;
    let calvoWidth = 50;
    let calvoHeight = 50;
    const calvoX = 100;

    const pipeWidth = 50
    let pipespeed = 4;
    const pipes = [];
    const coins = [];

    // ---------- SALTO ----------
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

    // ====================================================
    //        INICIO + REINICIO DE PARTIDA
    // ====================================================

    function resumeParallax() {
        document.querySelectorAll(".layer").forEach(layer =>
            layer.classList.remove("paused")
        );
    }

    function initGameLogic() {

        if (calvo) {
            calvoWidth = calvo.clientWidth;
            calvoHeight = calvo.clientHeight;
        }

        // Eliminar pipes
        pipes.forEach(pipe => {
            if (pipe.topPipe?.parentNode) pipe.topPipe.remove();
            if (pipe.bottomPipe?.parentNode) pipe.bottomPipe.remove();
        });

        coins.forEach(coin => {
            if (coin.el?.parentNode) coin.el.remove();
        });
        
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
        calvo.classList.remove("flap", "dead");

        piso.style.animationPlayState = "running";
        resumeParallax();

        gameRunning = true;

        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        if (obstacleInterval) clearInterval(obstacleInterval);

        gameLoop();
        startObstacleGenerator();
    }

    // ====================================================
    //   OBSTÁCULOS Y MONEDAS 
    // ====================================================

    function startObstacleGenerator() {
        if (obstacleInterval) clearInterval(obstacleInterval);
        obstacleInterval = setInterval(() => {
            if (gameRunning) createObstacle();
        }, 2000);
    }

    function createObstacle() {
        if (!gameRunning) return;
        const spikeHeadHeight = 60;
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

        const topContainer = document.createElement("div");
        topContainer.classList.add("pipe-container");
        topContainer.style.height = pipeTopHeight + "px";
        topContainer.style.left = gameContainer.clientWidth + "px";

        const topBody = document.createElement("div");
        topBody.classList.add("pipe-body");

        const topHead = document.createElement("img");
        topHead.src = "img/Flappy/spike.png";
        topHead.classList.add("pipe-head");

        topContainer.append(topBody, topHead);

        const bottomContainer = document.createElement("div");
        bottomContainer.classList.add("pipe-container");
        bottomContainer.style.height = bottomPipeHeight + "px";
        bottomContainer.style.left = gameContainer.clientWidth + "px";
        bottomContainer.style.top = bottomPipeTop + "px";

        const bottomHead = document.createElement("img");
        bottomHead.src = "img/Flappy/spike_down.png";
        bottomHead.classList.add("pipe-head");

        const bottomBody = document.createElement("div");
        bottomBody.classList.add("pipe-body");

        bottomContainer.append(bottomHead, bottomBody);

        gameContainer.append(topContainer, bottomContainer);

        pipes.push({
            topPipe: topContainer,
            bottomPipe: bottomContainer,
            x: gameContainer.clientWidth,
            pipeTopHeight,
            pipeGap,
            passed: false
        });

        if (Math.random() > 0.8) {
            const coinSize = 30;
            const safeMargin = 15;

            const minCoinY = pipeTopHeight + safeMargin;
            const maxCoinY = pipeTopHeight + pipeGap - coinSize - safeMargin;

            const randomY = Math.random() * (maxCoinY - minCoinY) + minCoinY;
            const coinX = gameContainer.clientWidth + (pipeWidth / 2) - (coinSize / 2);

            createCoin(coinX, randomY);
        }
    }

    function createCoin(x, y) {
        const coinEl = document.createElement("div");
        coinEl.classList.add("coin");
        coinEl.style.left = `${x}px`;
        coinEl.style.top = `${y}px`;
        gameContainer.appendChild(coinEl);

        coins.push({
            el: coinEl,
            x,
            y,
            width: 32,
            height: 32,
            collected: false
        });
    }
    // ====================================================
    //  MOVIMIENTO Y COLISIONES
    // ====================================================
    function movePipes() {
        for (let i = 0; i < pipes.length; i++) {
            const pipe = pipes[i];

            pipe.x -= pipespeed;
            pipe.topPipe.style.left = `${pipe.x}px`;
            pipe.bottomPipe.style.left = `${pipe.x}px`;

            if (!pipe.passed && (pipe.x + pipeWidth) < calvoX) {
                score++;
                updateScoreUI();
                pipe.passed = true;
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
            coin.el.style.left = `${coin.x}px`;

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

    function collectCoin(coin) {
        coin.collected = true;
        coin.el.remove();
        score += 5;
        updateScoreUI();
    }

    function updateScoreUI() {
        scoreDisplay.innerText = score;
    }

    // ====================================================
    //       COLISIONES
    // ====================================================

    function collisionDetected(pipe) {
        const cTop = calvoY + hitboxPadding;
        const cBottom = calvoY + calvoHeight - hitboxPadding;
        const cLeft = calvoX + hitboxPadding;
        const cRight = calvoX + calvoWidth - hitboxPadding;

        const pLeft = pipe.x;
        const pRight = pipe.x + pipeWidth;

        const topBottom = pipe.pipeTopHeight;
        const bottomTop = pipe.pipeTopHeight + pipe.pipeGap;

        if (cRight > pLeft && cLeft < pRight) {
            if (cTop < topBottom || cBottom > bottomTop) return true;
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
    //      MUERTE
    // ====================================================

    function pauseParallax() {
        document.querySelectorAll(".layer").forEach(layer =>
            layer.classList.add("paused")
        );
    }

    function muertePelado() {
        if (!gameRunning) return;

        gameRunning = false;
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        if (obstacleInterval) clearInterval(obstacleInterval);

        calvo.classList.add("dead");
        piso.style.animationPlayState = "paused";
        pauseParallax();

        setTimeout(showEndMenu, 1000);
    }

    function showEndMenu() {
        if (endMessage) endMessage.innerText = `Hiciste un total de ${score} puntos`;
        scoreDisplay.style.display = "none";

        endMenu.style.display = "flex";
        setTimeout(() => {
            endMenu.style.opacity = "1";
        }, 10);
    }

    // ====================================================
    //        GAME LOOP
    // ====================================================

    function gameLoop() {
        if (!gameRunning) return;

        velocity += gravity;
        calvoY += velocity;
        calvo.style.top = `${calvoY}px`;

        const gameHeight = gameContainer.clientHeight;
        const pisoHeight = piso.clientHeight;

        const floorLimit = gameHeight - pisoHeight - calvoHeight + 10;

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

        gameLoopId = requestAnimationFrame(gameLoop);
    }

});


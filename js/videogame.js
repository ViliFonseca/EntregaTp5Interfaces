// =========================================
// FUNCIONES DE UI (MENÚS, OVERLAYS)
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
// INICIALIZACIÓN (DOM)
// =========================================

document.addEventListener("DOMContentLoaded", () => {
    activarCorazonToggle('#likeBtn');
    // --- Referencias a elementos del HTML principal ---
    const playButton = document.getElementById("playButton");
    const overlay = document.getElementById("gameOverlay"); 
    const previewImage = document.querySelector(".game-screen > img");
    const startMenu = document.getElementById("startMenu");
    const howToPlay = document.getElementById("howToPlay");
    
    // --- 1. INYECTAR EL NUEVO MENÚ DE SELECCIÓN DE PERSONAJE (SIMPLIFICADO) ---
    const characterSelectHTML = `
      <div class="start-menu" id="characterSelectMenu" style="display:none; z-index: 6;">
        <div class="menu-content">
          <h1>Elige tu Ficha</h1>
          <button class="peg-select-btn" data-peg="terrorista">Terrorista</button>
          <button class="peg-select-btn" data-peg="antiterrorista">Antiterrorista</button>
        </div>
      </div>
    `;
    const gameScreenContainer = document.querySelector(".game-screen");
    if (gameScreenContainer) {
        gameScreenContainer.insertAdjacentHTML('beforeend', characterSelectHTML); // InsertAdjacentHTML inyecta en el elemento seleccionado
    } else {
        document.body.insertAdjacentHTML('beforeend', characterSelectHTML); // Fallback
    }

    // --- 2. CONFIGURAR EL FLUJO DE MENÚS (SIMPLIFICADO) ---
    const characterSelectMenu = document.getElementById("characterSelectMenu");

    // Play (Overlay) -> Menú Inicio
    playButton.addEventListener("click", () => {
      if (previewImage) previewImage.style.display = "none"; // Oculta la imagen de vista previa si es que existe una
      switchScreens(overlay, startMenu, 300); // Cambia la pantalla del overlay al menú de inicio
    });

    // Menú Inicio (Jugar) -> Menú Selección de Ficha
    document.getElementById("startGameBtn").addEventListener("click", () => {
      switchScreens(startMenu, characterSelectMenu, 300); // Cuandos se toca jugar, va al menú de selección de ficha
    });
    
    // Un solo listener para AMBOS botones de selección
    characterSelectMenu.querySelectorAll('.peg-select-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            
            // 1. Obtenemos la ficha del atributo 'data-peg' del botón
            selectedPeg = event.target.dataset.peg; 
            
            // 3. Iniciamos el juego
            startGame();
        });
    });

    // --- 3. BOTONES "CÓMO JUGAR" ---
    document.getElementById("howToPlayBtn").addEventListener("click", () => {
      howToPlay.style.display = "flex"; //Mostrar el howToPlay  
    });
    document.getElementById("closeHowToPlay").addEventListener("click", () => {
      howToPlay.style.display = "none"; //Ocultar el howToPlay
    });

    // --- 4. BOTONES (COMPARTIR, FULLSCREEN) ---
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

    // --- 5. INICIALIZAR EL JUEGO (PREPARAR CANVAS, ETC.) ---
    initGameSetup();
});


// =========================================
// LÓGICA DEL JUEGO (PEG SOLITAIRE)
// =========================================

// --- Variables Globales del Juego ---
let canvas, ctx; 
let board = []; 
let draggingPeg = null; 
let possibleMoves = []; 
let gameOver = false;
let timeRemaining; 
let timerInterval = null; 
let mousePos = { x: 0, y: 0 }; 
let animationFrameId = null; 

// --- Variables de Imágenes y Selección ---
let boardImage = null; 
let pegImage = null;   
let selectedPeg = 'terrorista'; // Valor por defecto

// --- Constantes del Juego ---
const CELL_SIZE = 70; 
const PEG_SIZE = 60;  
const GAME_TIME_LIMIT = 300; 

// --- Diseño del Tablero ---
// -1 = fuera del tablero
//  0 = lugar vacío
//  1 = ficha presente
const initialBoardLayout = [
  [-1, -1, 1, 1, 1, -1, -1],
  [-1, -1, 1, 1, 1, -1, -1],
  [ 1,  1, 1, 1, 1,  1,  1],
  [ 1,  1, 1, 0, 1,  1,  1], 
  [ 1,  1, 1, 1, 1,  1,  1],
  [-1, -1, 1, 1, 1, -1, -1],
  [-1, -1, 1, 1, 1, -1, -1]
];

// ==================== INICIALIZACIÓN ====================

/**
 * Bucle de animación para las pistas (hints).
 */
function animate() {
    redrawGame(); 
    animationFrameId = requestAnimationFrame(animate); 
}

/**
 * Función llamada para MOSTRAR la pantalla del juego y CARGAR/RECARGAR las imágenes.
 */
function startGame() {
    const playingScreen = document.getElementById("playingScreen");
    const characterSelectMenu = document.getElementById("characterSelectMenu");
    
    // Oculta el menú de selección y muestra la pantalla de juego
    switchScreens(characterSelectMenu, playingScreen, 300);
    
    // Carga las imágenes (tablero y ficha seleccionada) y luego llama a resetGame()
    loadImagesAndStart();
}

/**
 * Prepara el canvas y los menús del juego. Se llama UNA SOLA VEZ en DOMContentLoaded.
 */
function initGameSetup() {
  const playingScreen = document.getElementById("playingScreen");
  
  // Inserta el canvas y la inerfaz 
  playingScreen.innerHTML = `
    <canvas id="gameCanvas" width="490" height="490"></canvas>
    
    <div class="hud" id="game-ui">
      <span id="timer">Tiempo: 05:00</span>
      <button id="restartBtn">Reiniciar</button>
    </div>

    <div class="game-modal" id="endMenu" style="display: none; z-index: 10;">
        <h2 id="endMessage"></h2>
        <p id="endPegCount"></p>
        <button id="restartGameBtn">Jugar de nuevo</button>
    </div>
  `;

  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  // ==================== EVENTOS (click / drag) ====================
  
  canvas.addEventListener("mousedown", (e) => {
    if (gameOver) return; 
    const { row, col } = getCellFromMouse(e); 
    
    if (board[row] && board[row][col] === 1) {
        draggingPeg = { row, col }; 
        possibleMoves = calculatePossibleMoves(row, col);
        
        const rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
        
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animate(); // Inicia el bucle de animación de pistas
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!draggingPeg) return; 
    
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
  });


  canvas.addEventListener("mouseup", (e) => {
    if (gameOver || !draggingPeg) return; 
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;

    const { row: dropRow, col: dropCol } = getCellFromMouse(e);

    // Si el movimiento es valido, hace el movimiento
    if (isValidMove(draggingPeg.row, draggingPeg.col, dropRow, dropCol)) {
      makeMove(draggingPeg.row, draggingPeg.col, dropRow, dropCol); 
    }

    draggingPeg = null; 
    possibleMoves = []; 
    redrawGame(); 

    // Comprueba si quedan movimientos
    if (!hasMovesLeft()) {
      checkWinAndShowMenu();
    }
  });

  canvas.addEventListener("mouseleave", (e) => {
    if (draggingPeg) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        draggingPeg = null;
        possibleMoves = [];
        redrawGame(); 
    }
  });
  // =============================================================

  // Asigna la función de reinicio al botón (REINICIO RÁPIDO)
  document.getElementById("restartBtn").onclick = () => {
      switchScreens(playingScreen, characterSelectMenu, 0);
      resetGame(); 
  };
}

/**
 * Carga las imágenes del juego (tablero y ficha seleccionada).
 * Al terminar, llama a resetGame().
 */
function loadImagesAndStart() {
  if (!ctx) return;
  
  const boardUrl = "img/Videogame/peg-background.jpg";
  // Elige una de las fichas
  const pegUrl = selectedPeg === 'terrorista' 
                 ? "img/Videogame/terrorista.png" 
                 : "img/Videogame/antiterrorista.png"; 

  const boardImg = new Image();
  const pegImg = new Image();

  let loadedCount = 0;
  const totalImages = 2; 

  const onImageLoad = () => {
    loadedCount++;
    if (loadedCount === totalImages) {
      boardImage = boardImg;
      pegImage = pegImg;
      
      // Inicia el juego reseteando el tablero
      resetGame();
    }
  };

  boardImg.onload = onImageLoad;
  pegImg.onload = onImageLoad;

  boardImg.src = boardUrl;
  pegImg.src = pegUrl; 
}

// ==================== DIBUJO ====================

/**
 * Redibuja todo el estado del juego en el canvas.
 */
function redrawGame() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    drawPegs(); 

    if (draggingPeg) {
        const x = mousePos.x - PEG_SIZE / 2;
        const y = mousePos.y - PEG_SIZE / 2;
        ctx.globalAlpha = 0.75; 
        ctx.drawImage(pegImage, x, y, PEG_SIZE, PEG_SIZE);
        ctx.globalAlpha = 1.0; 
    }
}


// Dibuja el tablero con forma de cruz (+)
function drawBoard() {
  if (!ctx || !boardImage) return;

  const w = canvas.width;
  const h = canvas.height;

  // Ajusta el grosor de los brazos de la cruz (0 a 1)
  // Si bajás el número, los brazos se hacen más finos
  const tInset = 0.28;
  const tOutset = 1 - tInset;

  // Metodo auxiliar que crea la forma de cruz
  function makePlus(ctx, W, H, t1, t2) {
    ctx.beginPath();
    ctx.moveTo(W * t1, 0);
    ctx.lineTo(W * t2, 0);
    ctx.lineTo(W, H * t1);
    ctx.lineTo(W, H * t2);
    ctx.lineTo(W * t2, H);
    ctx.lineTo(W * t1, H);
    ctx.lineTo(0, H * t2);
    ctx.lineTo(0, H * t1);
    ctx.closePath();
  }

  // Dibujamos la imagen de fondo recortada dentro de la cruz
  ctx.save();
  makePlus(ctx, w, h, tInset, tOutset);
  ctx.clip();

  // Ajusta la imagen para que cubra todo el canvas
  const imgW = boardImage.naturalWidth || boardImage.width;
  const imgH = boardImage.naturalHeight || boardImage.height;
  const imgRatio = imgW / imgH;
  const canvasRatio = w / h;
  let sx = 0, sy = 0, sW = imgW, sH = imgH;

  if (imgRatio > canvasRatio) {
    // Si la imagen es más ancha, cortamos los costados
    sW = Math.round(imgH * canvasRatio);
    sx = Math.round((imgW - sW) / 2);
  } else {
    // Si es más alta, cortamos arriba y abajo
    sH = Math.round(imgW / canvasRatio);
    sy = Math.round((imgH - sH) / 2);
  }

  ctx.drawImage(boardImage, sx, sy, sW, sH, 0, 0, w, h);
  ctx.restore();
}


// Recorre el 'board' y dibuja cada ficha, hueco o pista animada.
function drawPegs() {
  if (!ctx || !pegImage) return; 
  
  // Recorre el tablero
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const value = board[row][col];
      
      // Calcula la position de la celda
      const x = col * CELL_SIZE + (CELL_SIZE - PEG_SIZE) / 2;
      const y = row * CELL_SIZE + (CELL_SIZE - PEG_SIZE) / 2;
      const centerX = col * CELL_SIZE + CELL_SIZE / 2;
      const centerY = row * CELL_SIZE + CELL_SIZE / 2;

      if (value === 1) { // Si es una ficha
        if (draggingPeg && draggingPeg.row === row && draggingPeg.col === col) {
            continue; 
        }

        ctx.drawImage(pegImage, x, y, PEG_SIZE, PEG_SIZE);

      } else if (value === 0) { // Si es un hueco
        ctx.beginPath();
        ctx.arc(centerX, centerY, PEG_SIZE / 3, 0, 2 * Math.PI, false); 
        ctx.fillStyle = '#202020';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX, centerY, PEG_SIZE / 3.5, 0, 2 * Math.PI, false);
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Checkea que haya algun movimiento posible en esta celda
        const isPossible = possibleMoves.some(move => move.row === row && move.col === col);
        
        // Pistas con animacion 
        if (isPossible) { 
            const pulse = (Math.sin(Date.now() / 200) + 1) / 2; 

            const minRadius = PEG_SIZE / 2.8;
            const maxRadius = PEG_SIZE / 2.2;
            const currentRadius = minRadius + (pulse * (maxRadius - minRadius));

            const minOpacity = 0.4;
            const maxOpacity = 0.8;
            const currentOpacity = minOpacity + (pulse * (maxOpacity - minOpacity));

            ctx.beginPath();
            ctx.arc(centerX, centerY, currentRadius, 0, 2 * Math.PI, false); 
            ctx.fillStyle = `rgba(255, 230, 0, ${currentOpacity})`;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 230, 0, 0.9)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
      }
    }
  }
}

// ==================== LÓGICA DEL JUEGO ====================

/**
 * Reinicia el juego a su estado inicial.
 */
function resetGame() {
  board = initialBoardLayout.map(row => [...row]);
  draggingPeg = null;
  possibleMoves = [];
  gameOver = false;
  timeRemaining = GAME_TIME_LIMIT;

  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
  clearInterval(timerInterval); 

  updateTimerDisplay(); 
  redrawGame(); 
  startTimer(); 
}

/**
 * Inicia el temporizador de cuenta atrás.
 */
function startTimer() {
    clearInterval(timerInterval); 
    timerInterval = setInterval(() => {
        if (timeRemaining <= 0) {
          clearInterval(timerInterval);
          gameOver = true;
          // --- DERROTA POR TIEMPO ---
          showEndMenu(false, countPegs());
          return;
        }

        timeRemaining--; 
        updateTimerDisplay(); 
    }, 1000);
}

/**
 * Actualiza el texto del temporizador en la UI.
 */
function updateTimerDisplay() {
    const timerDisplay = document.getElementById("timer");
    if (!timerDisplay) return;
    
    const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, "0");
    const seconds = (timeRemaining % 60).toString().padStart(2, "0");
    timerDisplay.textContent = `Tiempo: ${minutes}:${seconds}`;
}

// ==================== MOVIMIENTOS Y REGLAS ====================

/**
 * Calcula todos los movimientos válidos desde una ficha específica.
 */
function calculatePossibleMoves(r, c) {
    const moves = [];
    // Estas son las 4 direcciones de salto (2 arriba, 2 abajo, 2 izq, 2 der)
    const directions = [ [-2, 0], [2, 0], [0, -2], [0, 2] ];
    
    for (const [dr, dc] of directions) {
        const destRow = r + dr;
        const destCol = c + dc;

        // Reutiliza la función "cerebro" para cada una de las 4 direcciones
        if (isValidMove(r, c, destRow, destCol)) {
            // Si es válido, añade ese destino a la lista de "pistas"
            moves.push({ row: destRow, col: destCol });
        }
    }
    return moves; // Devuelve la lista de huecos válidos
}

/**
 * Convierte las coordenadas (x, y) del clic a la celda (fila, columna).
 */
function getCellFromMouse(e) {
  const rect = canvas.getBoundingClientRect(); 
  const x = e.clientX - rect.left; 
  const y = e.clientY - rect.top; 
  const col = Math.floor(x / CELL_SIZE);
  const row = Math.floor(y / CELL_SIZE);
  return { row, col };
}

/**
 * Comprueba si un movimiento es válido.
 */
function isValidMove(r1, c1, r2, c2) {
  // --- 1: El destino debe ser un HUECO ---
  // Si la celda de destino (r2, c2) no existe O NO es un 0, el movimiento es inválido.
  if (!board[r2] || board[r2][c2] !== 0) return false;

  // Calculamos la distancia del "salto"
  const dr = r2 - r1; // Distancia en filas
  const dc = c2 - c1; // Distancia en columnas

  // ---  2: Debe ser un salto de EXACTAMENTE 2 espacios (vertical) ---
  if (Math.abs(dr) === 2 && dc === 0) {
    const midRow = r1 + dr / 2; // Calcula la fila de EN MEDIO
    // (Ej: si saltas de fila 1 a 3, midRow es 2)
    
    // ---  3: Debes saltar SOBRE OTRA FICHA ---
    return board[midRow][c1] === 1; // ¿Había una ficha (1) en medio?
  }
  // --- 2 (Alternativa): Debe ser un salto de EXACTAMENTE 2 espacios (horizontal) ---
  else if (Math.abs(dc) === 2 && dr === 0) {
    const midCol = c1 + dc / 2; // Calcula la columna de EN MEDIO
    
    // --- 3 (Alternativa): Debes saltar SOBRE OTRA FICHA ---
    return board[r1][midCol] === 1; // ¿Había una ficha (1) en medio?
  }
  
  // Si no es un salto vertical u horizontal de 2 espacios, es inválido.
  return false;
}

/**
 * Hace el movimiento en board.
 */
function makeMove(r1, c1, r2, c2) {
  // Calcula la celda de EN MEDIO (la que fue "comida")
  const midRow = (r1 + r2) / 2;
  const midCol = (c1 + c2) / 2;
  
  // 1. Vaciamos el origen:
  board[r1][c1] = 0; 
  
  // 2. Vaciamos (comemos) la ficha del medio:
  board[midRow][midCol] = 0; 
  
  // 3. Llenamos el destino con la ficha:
  board[r2][c2] = 1; 
}

/**
 * Checkea si queda un movimiento valido.
 */
function hasMovesLeft() {
  // Recorre CADA celda del tablero
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      
      // Si la celda tiene una ficha (1)...
      if (board[r][c] === 1) { 
        
        // ...pregunta: ¿Esa ficha tiene algún movimiento posible?
        if (calculatePossibleMoves(r, c).length > 0) {
            // ¡Sí! Aún hay movimientos. El juego sigue.
            return true;
        }
      }
    }
  }
  // Si el bucle termina, significa que revisó TODAS las fichas
  // y NINGUNA tenía movimientos.
  return false;
}

// ==================== Logica de Victoria/Derrota ====================

/**
 * Cuenta cuántas fichas quedan en el tablero.
 */
function countPegs() {
    let count = 0;
    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
            if (board[r][c] === 1) count++;
        }
    }
    return count;
}

/**
 * Se llama cuando no quedan más movimientos.
 * Decide si es victoria (1 ficha) o derrota (>1 ficha).
 */
function checkWinAndShowMenu() {
    if (gameOver) return; // Evita que se llame múltiples veces

    clearInterval(timerInterval);
    gameOver = true;
    
    const pegCount = countPegs();
    if (pegCount === 1) {
        // --- VICTORIA ---
        showEndMenu(true, pegCount);
    } else {
        // --- DERROTA (SIN MOVIMIENTOS) ---
        showEndMenu(false, pegCount);
    }
}

/**
 * Muestra el menú final de Victoria o Derrota.
 */
function showEndMenu(win, pegCount) {
    const endMenu = document.getElementById("endMenu");
    const endMessage = document.getElementById("endMessage");
    const endPegCount = document.getElementById("endPegCount");
    const playingScreen = document.getElementById("playingScreen"); 

    if (win) {
        endMessage.textContent = "🏆 ¡Felicidades, ganaste! 🏆";
        endPegCount.textContent = "Dejaste solo 1 ficha en el tablero.";
    } else {
        endMessage.textContent = "💀 ¡Perdiste! 💀";
        if (timeRemaining <= 0) {
            endPegCount.textContent = `Se acabó el tiempo. Te quedaron ${pegCount} fichas.`;
        } else {
            endPegCount.textContent = `No quedan más movimientos. Te quedaron ${pegCount} fichas.`;
        }
    }
    
    endMenu.style.display = "flex";

    // Configura el botón para volver al menú de selección de personaje
    document.getElementById("restartGameBtn").onclick = () => {
        endMenu.style.display = "none";
        const characterSelectMenu = document.getElementById("characterSelectMenu");
        
        // Oculta la pantalla de juego y muestra la de selección
        switchScreens(playingScreen, characterSelectMenu, 300);
        
        // Resetea el tablero para la próxima vez que jueguen
        resetGame(); 
    };
}
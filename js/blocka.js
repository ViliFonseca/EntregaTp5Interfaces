document.addEventListener('DOMContentLoaded', () => {
  // ==============================
  // ELEMENTOS DEL DOM
  // ==============================
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const startButton = document.getElementById('startButton');
  const nextLevelButton = document.getElementById('nextLevelButton');
  const timerDisplay = document.getElementById('timer');

  const gameControls = document.getElementById('game-controls');
  const postGameOptions = document.getElementById('post-game-options');
  const gameMessage = document.getElementById('game-message');
  const gameSubmessage = document.getElementById('game-submessage');

  const ingameInstructionsBtn = document.getElementById('ingame-instructions-btn');
  const instructionsModal = document.getElementById('instructions-modal');
  const closeInstructionsBtn = document.getElementById('close-instructions');

  const gamePreviewOverlay = document.getElementById('gamePreviewOverlay');
  const playGameButton = document.getElementById('playGameButton');
  const ingameUIOverlay = document.querySelector('.ingame-ui-overlay');
  const gameScreen = document.querySelector('.blocka-game-screen');
  const helpButton = document.getElementById('helpButton');

  // ==============================
  // CONFIGURACIÓN DEL JUEGO
  // ==============================
  const IMAGE_BANK = [
    'img/Blocka/foto1.jpg',
    'img/Blocka/foto2.jpg',
    'img/Blocka/foto3.jpg',
    'img/Blocka/foto4.jpg',
    'img/Blocka/foto5.jpg',
    'img/Blocka/foto6.jpg',
  ];

  const LEVELS = [
    { level: 1, filter: null, rows: 2, cols: 2, maxTime: 600 },
    { level: 2, filter: 'brightness', rows: 4, cols: 4, maxTime: 300 },
    { level: 3, filter: 'grayscale', rows: 6, cols: 6, maxTime: 120 },
    { level: 4, filter: 'negative', rows: 8, cols: 8, maxTime: 60 },
  ];

  let currentLevel = 1;
  let image = null;
  let pieces = [];
  let seconds = 0;
  let timerInterval = null;
  let isGameActive = false;
  let helpUsedThisLevel = false;

  // ==============================
  // FUNCIONES DEL JUEGO
  // ==============================
  function startGame(level) {
    const config = LEVELS.find((l) => l.level === level); // Busca el nivel dentro el archivo de niveles
    if (!config) { // Comprueba q el nivel existe
      winGame();
      return; // Si no se empieza nuevamente
    }

    isGameActive = true;
    helpUsedThisLevel = false;

    helpButton.style.display = 'block'; // Se muestra el boton de ayuda

    gameControls.classList.add('hidden');
    postGameOptions.style.display = 'none';
    canvas.style.display = 'block';
    ingameUIOverlay.style.display = 'block';
    gameScreen.classList.add('game-active-bg');

    loadImageAndStart(config);
  }

  function loadImageAndStart(config) { // Carga la imagen
    const randomIndex = Math.floor(Math.random() * IMAGE_BANK.length);
    const imageUrl = IMAGE_BANK[randomIndex];
    const img = new Image();

    img.onload = () => {
      image = img;
      preparePieces(img, config.rows, config.cols); // Construye el arreglo pieces
      draw();
      startTimer();
    };

    img.src = imageUrl;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Borra el canvas

    if (!isGameActive && image) {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return;
    }

    pieces.forEach((piece) => { // Recorre todas las piezas
      ctx.save(); 
      ctx.translate(piece.x + piece.width / 2, piece.y + piece.height / 2); // Mueve al centro
      ctx.rotate((piece.rotation * Math.PI) / 180); // Rota sobre si misma
      ctx.drawImage(
        image,
        piece.sx, // Cordenda X de la parte que se recorta
        piece.sy, // Cordenada Y de la parte que se recorta
        piece.sw, // Ancho del cut
        piece.sh, // Altura del recorte
        -piece.width / 2,  // Hace q se dibuje centrado
        -piece.height / 2,
        piece.width, // Altura y anchura final
        piece.height
      );
      ctx.restore(); // Se restaura pa q cambien las otras 

      applyFilter(piece.filter, piece);
    });

    pieces.forEach((piece) => {
      if (piece.isHelped) {
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 5;
        ctx.strokeRect(piece.x, piece.y, piece.width, piece.height);
      }
    });
  }

  function preparePieces(img, rows, cols) {
    const pieceWidth = canvas.width / cols; // Divide el canvas con la cantidad de columnas asignada en el config
    const pieceHeight = canvas.height / rows;
    pieces = []; // Vacia pieces
    const possibleFilters = ['none', 'grayscale', 'brightness', 'negative'];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const rotation = [0, 90, 180, 270][Math.floor(Math.random() * 4)];
        const x = col * pieceWidth;
        const y = row * pieceHeight;

        // asignar filtro según nivel
        let filter = 'none';
        if (currentLevel >= 4) {
          filter = possibleFilters[Math.floor(Math.random() * possibleFilters.length)];
        } else {
          const levelConfig = LEVELS.find((l) => l.level === currentLevel);
          filter = levelConfig.filter || 'none';
        }

        pieces.push({
          x,
          y,
          width: pieceWidth,
          height: pieceHeight,
          sx: col * (img.width / cols),
          sy: row * (img.height / rows),
          sw: img.width / cols,
          sh: img.height / rows,
          rotation,
          filter,
          isHelped: false,
        });
      }
    }
  }

  function rotatePiece(x, y, direction) {
    if (!isGameActive) return;

    const piece = pieces.find(
      (p) => x >= p.x && x < p.x + p.width && y >= p.y && y < p.y + p.height
    );

    if (!piece || piece.isLocked) return;

    piece.rotation = (piece.rotation + direction + 360) % 360;
    draw();
    checkWin();
  }

  function checkWin() {
    const allCorrect = pieces.every((p) => p.rotation === 0);

    if (allCorrect) {
      isGameActive = false;
      stopTimer();
      ingameUIOverlay.style.display = 'none';
      helpButton.style.display = 'none';
      pieces.forEach((p) => (p.isLocked = false));
      draw();

      setTimeout(() => {
        gameMessage.textContent = `¡Nivel ${currentLevel} Superado!`;
        gameSubmessage.textContent = `Tu tiempo: ${timerDisplay.textContent}`;
        startButton.style.display = 'none';
        gameControls.classList.remove('hidden');
        postGameOptions.style.display = 'flex';
        postGameOptions.style.flexDirection = 'column';
        currentLevel++;

        if (currentLevel > LEVELS.length) {
          gameMessage.textContent = '¡HAS COMPLETADO BLOCKA!';
          gameSubmessage.textContent = 'MUCHAS GRACIAS POR JUGAR.';
          nextLevelButton.textContent = 'Jugar de Nuevo';
        } else {
          nextLevelButton.textContent = `Siguiente Nivel (${currentLevel})`;
        }
      }, 500);
    }
  }

  function winGame() {
    gameScreen.classList.remove('game-active-bg');
    canvas.style.display = 'none';
    helpButton.style.display = 'none';
    ingameUIOverlay.style.display = 'none';
    startButton.style.display = 'none';

    gameMessage.textContent = '¡Felicidades, has completado el juego!';
    gameSubmessage.textContent = '¡Gracias por jugar!';
    gameControls.classList.remove('hidden');
    postGameOptions.style.display = 'flex';
    nextLevelButton.textContent = 'Jugar de Nuevo';
    currentLevel = 1;
  }

  function loseLevel() {
    isGameActive = false;
    stopTimer();
    ingameUIOverlay.style.display = 'none';
    helpButton.style.display = 'none';

    gameMessage.textContent = 'Has perdido';
    gameSubmessage.textContent = 'No lograste completar el nivel en el tiempo solicitado.';
    gameControls.classList.remove('hidden');
    postGameOptions.style.display = 'flex';
    postGameOptions.style.flexDirection = 'column';
    nextLevelButton.textContent = 'Reintentar Nivel';

    nextLevelButton.onclick = () => {
      postGameOptions.style.display = 'none';
      helpUsedThisLevel = false;
      gameControls.classList.add('hidden');
      startGame(currentLevel);
    };
  }

  function useHelp() {
    if (!isGameActive || helpUsedThisLevel) return;

    const incorrectPieces = pieces.filter((p) => p.rotation !== 0);
    if (incorrectPieces.length > 0) {
      helpUsedThisLevel = true;
      helpButton.style.display = 'none';

      const pieceToFix =
        incorrectPieces[Math.floor(Math.random() * incorrectPieces.length)];
      pieceToFix.rotation = 0;
      pieceToFix.isLocked = true;
      pieceToFix.isHelped = true;

      seconds += 5;
      draw();
      checkWin();
    }
  }

  // ==============================
  // FILTROS
  // ==============================
  function applyFilter(filterType, piece) {
    if (!filterType || filterType === 'none') return;

    // Obtener imagen de la pieza ya dibujada en el canvas
    const imageData = ctx.getImageData(piece.x, piece.y, piece.width, piece.height);
    const data = imageData.data;

    switch (filterType) {
      case 'grayscale':
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = avg;
          data[i + 1] = avg;
          data[i + 2] = avg;
        }
        break;

      case 'brightness': {
        const brillo = 1.3;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * brillo);
          data[i + 1] = Math.min(255, data[i + 1] * brillo);
          data[i + 2] = Math.min(255, data[i + 2] * brillo);
        }
        break;
      }

      case 'negative':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
        break;

      default:
        break;
    }

    ctx.putImageData(imageData, piece.x, piece.y);
  }

  // ==============================
  // TEMPORIZADOR
  // ==============================
  function startTimer() {
    stopTimer();

    const config = LEVELS.find((l) => l.level === currentLevel);
    let remaining = config?.maxTime ?? 9999;

    // Mostrar el tiempo inicial
    const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
    const seconds = (remaining % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${minutes}:${seconds}`;
    timerDisplay.style.color = 'white';

    timerInterval = setInterval(() => {
      if (!isGameActive) {
        clearInterval(timerInterval);
        return;
      }

      remaining--;

      const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
      const seconds = (remaining % 60).toString().padStart(2, '0');
      timerDisplay.textContent = `${minutes}:${seconds}`;

      // Cambia a rojo cuando quedan 30 segundos o menos
      if (remaining <= 30) {
        timerDisplay.style.color = 'red';
      } else {
        timerDisplay.style.color = 'white';
      }

      // Si llega a 0, se termina el nivel
      if (remaining <= 0) {
        clearInterval(timerInterval);
        loseLevel();
      }
    }, 1000);
  }


  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // ==============================
  // EVENTOS
  // ==============================
  playGameButton.addEventListener('click', () => {  
    gamePreviewOverlay.classList.add('hidden');
    gameControls.classList.remove('hidden');
    gameScreen.classList.add('game-active-bg');
  });

  startButton.addEventListener('click', () => startGame(currentLevel)); // Se inicializa el juego con el nivel 1, definido en la constante

  nextLevelButton.addEventListener('click', () => { // Cuando se toca next level
    if (currentLevel > LEVELS.length) { // Analiza si estas en el final
      currentLevel = 1; // Si lo estas devuelve 1, para iniciar nuevamente
    }
    gameControls.classList.add('hidden');
    startGame(currentLevel); // Se empieza el juego desde el siguiente nivel
  });

  helpButton.addEventListener('click', useHelp); // Se activa el menu de ayuda

  canvas.addEventListener('click', (e) => { // Click izq
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    rotatePiece(canvasX, canvasY, -90);
  });

  canvas.addEventListener('contextmenu', (e) => { // Click derecho
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    rotatePiece(canvasX, canvasY, 90);
  });

  ingameInstructionsBtn.addEventListener('click', () => {
    instructionsModal.style.display = 'flex';
  });

  closeInstructionsBtn.addEventListener('click', () => {
    instructionsModal.style.display = 'none';
  });

  instructionsModal.addEventListener('click', (e) => {
    if (e.target === instructionsModal) {
      instructionsModal.style.display = 'none';
    }
  });
});

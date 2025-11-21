// Simulación de carga de 5 segundos con porcentaje y animación
(function () {
  const DURATION = 1000;  // tiempo total en ms
  const INTERVAL = 50;    // ms: frecuencia de actualización
  const steps = Math.ceil(DURATION / INTERVAL);

  const percentEl = document.getElementById('loader-percent');
  const loader = document.getElementById('app-loader');
  const progressCircle = document.querySelector('.progress-ring circle.progress');

  // circunferencia (2πr) con r = 40
  const R = 40;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  progressCircle.setAttribute('stroke-dasharray', CIRCUMFERENCE.toFixed(3));

  let currentStep = 0;
  const stepPercent = 100 / steps;

  function setProgress(percent) {
    const clamped = Math.min(Math.max(percent, 0), 100);
    const offset = CIRCUMFERENCE * (1 - clamped / 100);
    progressCircle.style.strokeDashoffset = offset.toFixed(3);
  }

  // Inicial
  setProgress(0);
  percentEl.textContent = '0%';

  // Intervalo para simular la carga
  const intervalId = setInterval(() => {
    currentStep++;
    const percent = Math.round(currentStep * stepPercent);
    const display = Math.min(percent, 100);

    percentEl.textContent = display + '%';
    setProgress(display);

    if (currentStep >= steps) {
      clearInterval(intervalId);

      // Pequeña pausa antes de ocultar
      setTimeout(() => {
        loader.classList.add('hidden');

        // Remover del DOM luego de la transición
        setTimeout(() => {
          if (loader && loader.parentNode) {
            loader.parentNode.removeChild(loader);
          }
        }, 350);
      }, 250);
    }
  }, INTERVAL);
})();

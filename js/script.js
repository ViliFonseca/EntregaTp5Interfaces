// ====================================================================
// 1. SELECTORES
// ====================================================================

// Menú Hamburguesa
const menuham = document.getElementById('menuham');
const toggle = document.getElementById('menu-toggle');
const overlay = document.getElementById('overlay');
// Menú de Usuario
const userBtn = document.getElementById("user");
const userMenu = document.getElementById("user-menu");
const cerrarSesionBtn = document.querySelector("#user-menu li:last-child");
const userSpan = userBtn.querySelector("span");
const userImg = userBtn.querySelector("img");

const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.querySelector(".modal-title");
const modalForm = modalOverlay.querySelector("form");
const closeBtn = document.querySelector(".close-btn");
const portada = document.querySelector('.portada'); 
let sesionActiva = true;
let modoRegistro = false;


// =============================================
// 2. PORTADA - CARRUSEL ANIMADO
// =============================================
if (portada) { // Si el contenedor .portada existe, ejecuta este código.
    const slides = portada.querySelectorAll('.portada-slide');
    const portadaDots = portada.querySelectorAll('.portada-dots div');
    let current = 0;

    function updateSlides(index) {
        slides.forEach((slide, i) => {
            slide.classList.remove('active', 'prev', 'next');
            if (i === index) slide.classList.add('active');
            if (i === (index - 1 + slides.length) % slides.length) slide.classList.add('prev');
            if (i === (index + 1) % slides.length) slide.classList.add('next');
      
      
          });

        portadaDots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        const jugarButtons = portada.querySelectorAll('.svg-wrapper');
        jugarButtons.forEach(button => {
        button.classList.remove('visible');
    });

    if (jugarButtons[index]) {
        jugarButtons[index].classList.add('visible');
    }
    }

    portada.querySelector('.arrow.left').addEventListener('click', () => {
        current = (current - 1 + slides.length) % slides.length;
        updateSlides(current);
    });

    portada.querySelector('.arrow.right').addEventListener('click', () => {
        current = (current + 1) % slides.length;
        updateSlides(current);
    });

    portadaDots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
            current = i;
            updateSlides(current);
        });
    });

    if (slides.length > 0) {
        updateSlides(current);
    }
}


// ====================================================================
// 3. LÓGICA DEL MENÚ HAMBURGUESA
// ====================================================================
if (toggle && menuham && overlay) {
  const inicioBtn = document.querySelector('.nav-btn.inicio');
  const cerrarMenuham = () => {
    menuham.classList.remove('open');
    overlay.classList.remove('show');
  };

  // Abre/Cierra con el botón
  toggle.addEventListener('click', () => {
    const isOpen = menuham.classList.toggle('open');
    overlay.classList.toggle('show', isOpen);
  });

  // Cierra al hacer clic en el overlay
  overlay.addEventListener('click', cerrarMenuham);
   if (inicioBtn) {
    inicioBtn.addEventListener('click', () => {
      window.location.href = 'Index.html'; // Cambia 'Index.html' por la URL de tu página de inicio
      cerrarMenuham();
    });

  // Cierra al redimensionar la ventana (para escritorio)
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
      cerrarMenuham();
    }
  });
}
}

// ====================================================================
// 4. LÓGICA DEL MENÚ DE USUARIO
// ====================================================================
if (userBtn && userMenu) {
  userBtn.addEventListener("click", (e) => {
    e.stopPropagation();
   
    if (sesionActiva) {
      userMenu.classList.toggle("open");
    } else {
      mostrarLogin();
      modalOverlay.classList.add("active");
    }
  });

  document.addEventListener("click", (e) => {
    if (!userBtn.contains(e.target) && !userMenu.contains(e.target)) {
      userMenu.classList.remove("open");
    }
  });
}

// ====================================================================
// ABRIR / CERRAR SESIÓN
// ====================================================================
cerrarSesionBtn.addEventListener("click", () => {
  sesionActiva = false;
  userSpan.style.display = "none";
  userImg.src = "img/Icons/icon_user.png"; 
  userMenu.classList.remove("open");
});

// ====================================================================
// ABRIR / CERRAR MODAL
// ====================================================================
userBtn.addEventListener("click", () => {
  if (!sesionActiva) {
    modalOverlay.classList.add("active");
    mostrarRegistro();
  }
});

closeBtn.addEventListener("click", () => modalOverlay.classList.remove("active"));
modalOverlay.addEventListener("click", e => {
  if (e.target === modalOverlay) modalOverlay.classList.remove("active");
});

// ====================================================================
// FORMULARIO: REGISTRO / LOGIN
// ====================================================================
function mostrarRegistro() {
  modoRegistro = true;
  modalTitle.textContent = "Registrarse";
  modalForm.innerHTML = `
    <div class="form-group"><label class=form-label>Nombre</label><input type="text" class="form-input" required></div>
    <div class="form-group"><label class=form-label>Apellido</label><input type="text" class="form-input" required></div>
    <div class="form-group"><label class=form-label>Nickname</label><input type="text" class="form-input" required></div>
    <div class="form-group"><label class=form-label>E-Mail</label><input type="email" class="form-input" required></div>
    <div class="form-group"><label class=form-label >Fecha de nacimiento</label><input type="date" class="form-input" required></div>
    <div class="form-group"><label class=form-label>Contraseña</label><input type="password" class="form-input" required></div>
    <div class="form-group"><label class=form-label>Repetir Contraseña</label><input type="password" class="form-input" required></div>
    </div>
    <button type="submit" class="submit-btn">Registrarse</button>
    <div class="footer-link">¿Ya tienes cuenta? <a href="#" id="toLogin">Inicia sesión</a>
  `;
}

function mostrarLogin() {
  modoRegistro = false;
  modalTitle.textContent = "Iniciar Sesión";
  modalForm.innerHTML = `
    <div class="form-group"><label class=form-label>E-Mail</label><input type="email" class="form-input" required></div>
    <div class="form-group"><label class=form-label>Contraseña</label><input type="password" class="form-input" required></div>
    <button type="submit" class="submit-btn">Ingresar</button>
    <div class="footer-link">¿No tienes cuenta? <a href="#" id="toRegister">Regístrate</a></div>
  `;
}

// ====================================================================
// CAMBIO ENTRE LOGIN / REGISTRO
// ====================================================================
modalOverlay.addEventListener("click", e => {
  if (e.target.id === "toLogin") {
    e.preventDefault();
    mostrarLogin();
  }
  if (e.target.id === "toRegister") {
    e.preventDefault();
    mostrarRegistro();
  }
});


// ====================================================================
// 5. LÓGICA DE LOS CARRUSELES HORIZONTALES
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
  const carruselContainers = document.querySelectorAll('.carrusel-container');

  carruselContainers.forEach(container => {
    const carrusel = container.querySelector('.carrusel');
    const leftArrow = container.querySelector('.carrusel-arrow.left');
    const rightArrow = container.querySelector('.carrusel-arrow.right');

    const updateArrowVisibility = () => {
      if (carrusel.scrollLeft === 0) {
        leftArrow.classList.add('hidden');
      } else {
        leftArrow.classList.remove('hidden');
      }

      if (carrusel.scrollLeft + carrusel.clientWidth + 1 >= carrusel.scrollWidth) {
        rightArrow.classList.add('hidden');
      } else {
        rightArrow.classList.remove('hidden');
      }
    };

    leftArrow.addEventListener('click', () => {
      const scrollAmount = carrusel.clientWidth * 0.8;
      carrusel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    rightArrow.addEventListener('click', () => {
      const scrollAmount = carrusel.clientWidth * 0.8;
      carrusel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });

    carrusel.addEventListener('scroll', updateArrowVisibility);
    updateArrowVisibility();
  });
});

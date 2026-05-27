const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbyw5Z5J_csn_17VHedPIeH6I3snTJuG2QmbRWekmdN0tTKTey5lfOq06fieBYlsF-eUhA/exec";

const contenedorServicios = document.getElementById('contenedor-servicios');
const contenedorTrabajos = document.getElementById('contenedor-trabajos');

// --- LÓGICA DEL CARRITO DE COMPRAS ---
let carrito = JSON.parse(localStorage.getItem('carrito_catalogo')) || [];
const MI_NUMERO_WPP = '5491165778502'; // Tu número de WhatsApp

// Función para guardar el carrito y actualizar el botón flotante
function actualizarInterfazCarrito() {
    localStorage.setItem('carrito_catalogo', JSON.stringify(carrito));
    
    // Contamos cuántos productos totales hay
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    
    // Buscamos el botón flotante de WhatsApp y le metemos un contador visual
    const botonWpp = document.querySelector('.wpp-flotante');
    if (botonWpp) {
        let badge = document.getElementById('wpp-badge');
        if (!badge && totalItems > 0) {
            badge = document.createElement('span');
            badge.id = 'wpp-badge';
            badge.style = 'position: absolute; top: -5px; right: -5px; background: #e74c3c; color: white; border-radius: 50%; padding: 3px 8px; font-size: 0.75rem; font-weight: bold; border: 2px solid white;';
            botonWpp.appendChild(badge);
        }
        if (totalItems > 0) {
            badge.innerText = totalItems;
            // Cambiamos la acción del botón flotante para que mande el pedido completo
            botonWpp.onclick = (e) => {
                e.preventDefault();
                enviarPedidoWhatsApp();
            };
            botonWpp.title = "Enviar lista de pedido por WhatsApp";
        } else {
            if (badge) badge.remove();
            botonWpp.onclick = null; // Vuelve a su comportamiento de chat común por defecto si está vacío
            botonWpp.title = "Escribinos por WhatsApp";
        }
    }
}

// Función para agregar un producto al carrito
window.agregarAlCarrito = function(id, titulo, precio) {
    const productoExistente = carrito.find(item => item.id === id);
    
    if (productoExistente) {
        productoExistente.cantidad += 1;
    } else {
        carrito.push({
            id: id,
            titulo: titulo,
            precio: parseFloat(precio) || 0,
            cantidad: 1
        });
    }
    
    alert(`¡Agregaste "${titulo}" al carrito! 🛒`);
    actualizarInterfazCarrito();
};

// Función para armar el texto y redirigir a WhatsApp
function enviarPedidoWhatsApp() {
    if (carrito.length === 0) return;
    
    let mensaje = "¡Hola! Me gustaría solicitar el presupuesto de los siguientes productos de mi lista:\n\n";
    let total = 0;
    
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        if (item.precio > 0) {
            mensaje += f"📦 *{item.cantidad}x* {item.titulo} - ${subtotal}\n";
        } else {
            mensaje += f"📦 *{item.cantidad}x* {item.titulo} (A cotizar)\n";
        }
    });
    
    if (total > 0) {
        mensaje += f"\n💰 *Total estimado: ${total}*\n";
    }
    mensaje += "\n¿Me podrías confirmar disponibilidad y tiempos de entrega?";
    
    // Limpiamos el carrito después de enviar el pedido
    carrito = [];
    actualizarInterfazCarrito();
    
    const urlWa = f"https://wa.me/{MI_NUMERO_WPP}?text={encodeURIComponent(mensaje)}";
    window.open(urlWa, '_blank');
}

// --- CARGAR PRODUCTOS DESDE GOOGLE SHEETS ---
async function cargarServicios() {
    try {
        const response = await fetch(URL_GOOGLE_SCRIPT);
        const productos = await response.json();

        if (!productos || productos.length === 0) {
            contenedorServicios.innerHTML = '<p style="text-align: center; color: #666; width: 100%;">No hay productos disponibles en este momento.</p>';
            return;
        }

        contenedorServicios.innerHTML = '';

        productos.forEach(prod => {
            const tarjeta = document.createElement('div');
            tarjeta.className = 'service-card';

            let urlSegura = prod.imagen_url;
            if (urlSegura && urlSegura.includes("drive.google.com")) {
                const fileId = urlSegura.split("id=")[1];
                urlSegura = `https://drive.google.com/thumbnail?id=${fileId}&sz=1000`;
            }

            const imagenHtml = urlSegura 
                ? `<img src="${urlSegura}" alt="${prod.titulo}" class="service-img">` 
                : '<div style="width:100%; height:200px; background:#eee; display:flex; align-items:center; justify-content:center; color:#999;">Sin foto</div>';

            // Si el precio viene vacío o es 0, mostramos "A cotizar"
            const precioMostrado = (prod.precio && parseFloat(prod.precio) > 0) 
                ? `$${parseFloat(prod.precio).toLocaleString('es-AR')}` 
                : 'Precio a cotizar';

            tarjeta.innerHTML = `
                ${imagenHtml}
                <div class="service-card-content">
                    <h3>${prod.titulo}</h3>
                    <p style="font-weight: bold; color: #1C5186; font-size: 1.2rem; margin-bottom: 8px;">${precioMostrado}</p>
                    <p>${prod.descripcion}</p>
                    <button class="btn-cotizar" style="width: 100%; border: none; cursor: pointer;" 
                        onclick="agregarAlCarrito(${prod.id}, '${prod.titulo}', '${prod.precio || 0}')">
                        🛒 Agregar a la Lista
                    </button>
                </div>
            `;
            
            tarjeta.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-cotizar')) return;
                tarjeta.classList.toggle('active');
            });

            contenedorServicios.appendChild(tarjeta);
        });
        
        // Ejecutamos la carga inicial del badge si hay algo guardado en localStorage
        actualizarInterfazCarrito();
        
    } catch (error) {
        console.error('Error al cargar productos:', error);
    }
}

// --- MANTENER LA GALERÍA DE FOTOS IGUAL ---
async function cargarTrabajos() {
    if (!contenedorTrabajos) return;
    try {
        const response = await fetch(`${URL_GOOGLE_SCRIPT}?type=trabajos`);
        const trabajos = await response.json();

        if (!trabajos || trabajos.length === 0) {
            contenedorTrabajos.innerHTML = '<p style="text-align: center; color: var(--color-secundario); width: 100%;">Próximamente fotos de nuestros proyectos.</p>';
            return;
        }

        contenedorTrabajos.innerHTML = '';

        trabajos.reverse().forEach(trabajo => {
            const item = document.createElement('div');
            item.className = 'carousel-item';

            let urlSegura = trabajo.imagen_url;
            if (urlSegura && urlSegura.includes("drive.google.com")) {
                const fileId = urlSegura.split("id=")[1];
                urlSegura = `https://drive.google.com/thumbnail?id=${fileId}&sz=2500`;
            }

            const img = document.createElement('img');
            img.src = urlSegura;
            img.alt = "Trabajo Realizado";
            img.style.cursor = "zoom-in";

            img.onclick = () => {
                document.getElementById('lightbox').style.display = 'block';
                document.getElementById('lightbox-img').src = urlSegura;
            };

            item.appendChild(img);
            contenedorTrabajos.appendChild(item);
        });

        function scrollAvanzar() {
            if (contenedorTrabajos.scrollLeft + contenedorTrabajos.offsetWidth >= contenedorTrabajos.scrollWidth - 10) {
                contenedorTrabajos.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                contenedorTrabajos.scrollBy({ left: contenedorTrabajos.offsetWidth / 2, behavior: 'smooth' });
            }
        }

        let intervaloCarrusel = setInterval(scrollAvanzar, 3000);
        contenedorTrabajos.addEventListener('mouseenter', () => clearInterval(intervaloCarrusel));
        contenedorTrabajos.addEventListener('mouseleave', () => intervaloCarrusel = setInterval(scrollAvanzar, 3000));
        contenedorTrabajos.addEventListener('touchstart', () => clearInterval(intervaloCarrusel)); 

    } catch (error) {
        console.error('Error al cargar trabajos:', error);
    }
}

// Inicializar cargas
cargarServicios();
cargarTrabajos();

// --- LÓGICA LIGHTBOX ---
const lightbox = document.getElementById('lightbox');
const lightboxClose = document.querySelector('.lightbox-close');
if (lightboxClose) { lightboxClose.onclick = () => lightbox.style.display = 'none'; }
window.onclick = (e) => { if (lightbox && e.target === lightbox) { lightbox.style.display = 'none'; } };

// Menú activo al scrollear
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.navbar-container nav a');
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (scrollY >= (sectionTop - 150)) { current = section.getAttribute('id'); }
    });
    navLinks.forEach(link => {
        link.classList.remove('nav-active');
        if (link.getAttribute('href') === `#${current}`) { link.classList.add('nav-active'); }
    });
});
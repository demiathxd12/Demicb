// JavaScript principal para la tienda de ropa
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar componentes
    initializeCart();
    initializeProductOptions();
    initializeSearch();
    initializeForms();
    initializeImageGallery();
    initializeQuantitySelectors();
    initializeMobileMenu();
});

// Gestión del carrito
function initializeCart() {
    const addToCartForms = document.querySelectorAll('.add-to-cart-form');
    const cartItems = document.querySelectorAll('.cart-item');
    
    // Agregar al carrito
    addToCartForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const button = this.querySelector('button[type="submit"]');
            const originalText = button.textContent;
            
            // Mostrar loading
            button.disabled = true;
            button.innerHTML = '<span class="loading"></span> Agregando...';
            
            fetch('/carrito/agregar', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Producto agregado al carrito', 'success');
                    updateCartCount();
                    
                    // Animación del botón
                    button.textContent = '✓ Agregado';
                    button.style.background = 'var(--success-color)';
                    
                    setTimeout(() => {
                        button.textContent = originalText;
                        button.style.background = '';
                        button.disabled = false;
                    }, 2000);
                } else {
                    showNotification(data.error || 'Error agregando producto', 'error');
                    button.textContent = originalText;
                    button.disabled = false;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error agregando producto', 'error');
                button.textContent = originalText;
                button.disabled = false;
            });
        });
    });
    
    // Actualizar cantidad en carrito
    const quantityInputs = document.querySelectorAll('.cart-quantity-input');
    quantityInputs.forEach(input => {
        input.addEventListener('change', function() {
            updateCartItemQuantity(this.dataset.itemId, this.value);
        });
    });
    
    // Eliminar del carrito
    const removeButtons = document.querySelectorAll('.remove-cart-item');
    removeButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
                removeCartItem(this.dataset.itemId);
            }
        });
    });
}

// Actualizar cantidad de item en carrito
function updateCartItemQuantity(itemId, quantity) {
    if (quantity < 1) return;
    
    fetch('/carrito/actualizar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            item_id: itemId,
            cantidad: quantity
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Recargar página para actualizar totales
            window.location.reload();
        } else {
            showNotification('Error actualizando cantidad', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error actualizando cantidad', 'error');
    });
}

// Eliminar item del carrito
function removeCartItem(itemId) {
    fetch('/carrito/eliminar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            item_id: itemId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Animar y remover el elemento
            const cartItem = document.querySelector(`[data-item-id="${itemId}"]`).closest('.cart-item');
            cartItem.style.transition = 'all 0.3s ease';
            cartItem.style.opacity = '0';
            cartItem.style.transform = 'translateX(-100%)';
            
            setTimeout(() => {
                cartItem.remove();
                updateCartCount();
                updateCartTotal();
            }, 300);
            
            showNotification('Producto eliminado del carrito', 'success');
        } else {
            showNotification('Error eliminando producto', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error eliminando producto', 'error');
    });
}

// Actualizar contador del carrito
function updateCartCount() {
    // Esta función se llamaría después de operaciones exitosas del carrito
    // Por simplicidad, recargamos la página o podrías hacer una petición AJAX
    const cartCountElement = document.querySelector('.cart-count');
    if (cartCountElement) {
        // Aquí podrías hacer una petición para obtener el nuevo conteo
        // Por ahora solo añadimos una animación
        cartCountElement.style.transform = 'scale(1.2)';
        setTimeout(() => {
            cartCountElement.style.transform = 'scale(1)';
        }, 200);
    }
}

// Opciones de producto (tallas, colores)
function initializeProductOptions() {
    const optionButtons = document.querySelectorAll('.option-btn');
    
    optionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const group = this.closest('.option-group');
            const groupButtons = group.querySelectorAll('.option-btn');
            
            // Remover selección anterior
            groupButtons.forEach(btn => btn.classList.remove('selected'));
            
            // Agregar selección actual
            this.classList.add('selected');
            
            // Actualizar campo hidden si existe
            const hiddenInput = group.querySelector('input[type="hidden"]');
            if (hiddenInput) {
                hiddenInput.value = this.dataset.value;
            }
        });
    });
}

// Búsqueda
function initializeSearch() {
    const searchForm = document.querySelector('.search-form');
    const searchInput = document.querySelector('.search-input');
    
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            const query = searchInput.value.trim();
            if (!query) {
                e.preventDefault();
                showNotification('Ingresa un término de búsqueda', 'warning');
            }
        });
    }
    
    // Búsqueda en tiempo real (opcional)
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length >= 3) {
                searchTimeout = setTimeout(() => {
                    // Aquí podrías implementar búsqueda en tiempo real
                    console.log('Búsqueda:', query);
                }, 300);
            }
        });
    }
}

// Formularios
function initializeForms() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        // Validación en tiempo real
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });
            
            input.addEventListener('input', function() {
                clearFieldError(this);
            });
        });
        
        // Validación al enviar
        form.addEventListener('submit', function(e) {
            let isValid = true;
            
            inputs.forEach(input => {
                if (!validateField(input)) {
                    isValid = false;
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                showNotification('Por favor, corrige los errores en el formulario', 'error');
            }
        });
    });
}

// Validar campo individual
function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let message = '';
    
    // Verificar si es requerido
    if (field.hasAttribute('required') && !value) {
        isValid = false;
        message = 'Este campo es obligatorio';
    }
    
    // Validaciones específicas por tipo
    if (value && field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            message = 'Ingresa un email válido';
        }
    }
    
    if (value && field.type === 'password' && value.length < 6) {
        isValid = false;
        message = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    if (value && field.type === 'tel') {
        const phoneRegex = /^[\+]?[0-9\-\s]+$/;
        if (!phoneRegex.test(value)) {
            isValid = false;
            message = 'Ingresa un teléfono válido';
        }
    }
    
    // Mostrar/ocultar error
    if (!isValid) {
        showFieldError(field, message);
    } else {
        clearFieldError(field);
    }
    
    return isValid;
}

// Mostrar error en campo
function showFieldError(field, message) {
    clearFieldError(field);
    
    field.classList.add('error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.color = 'var(--accent-color)';
    errorDiv.style.fontSize = '14px';
    errorDiv.style.marginTop = '5px';
    
    field.parentNode.appendChild(errorDiv);
}

// Limpiar error de campo
function clearFieldError(field) {
    field.classList.remove('error');
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

// Galería de imágenes
function initializeImageGallery() {
    const mainImage = document.querySelector('.main-image');
    const thumbnails = document.querySelectorAll('.thumbnail');
    
    if (mainImage && thumbnails.length > 0) {
        thumbnails.forEach(thumbnail => {
            thumbnail.addEventListener('click', function() {
                // Remover clase activa de todas las miniaturas
                thumbnails.forEach(thumb => thumb.classList.remove('active'));
                
                // Agregar clase activa a la seleccionada
                this.classList.add('active');
                
                // Cambiar imagen principal
                if (this.src) {
                    mainImage.src = this.src;
                }
            });
        });
    }
}

// Selectores de cantidad
function initializeQuantitySelectors() {
    const quantityContainers = document.querySelectorAll('.quantity-selector');
    
    quantityContainers.forEach(container => {
        const minusBtn = container.querySelector('.quantity-minus');
        const plusBtn = container.querySelector('.quantity-plus');
        const input = container.querySelector('.quantity-input');
        
        if (minusBtn && plusBtn && input) {
            minusBtn.addEventListener('click', function() {
                const currentValue = parseInt(input.value) || 1;
                if (currentValue > 1) {
                    input.value = currentValue - 1;
                    input.dispatchEvent(new Event('change'));
                }
            });
            
            plusBtn.addEventListener('click', function() {
                const currentValue = parseInt(input.value) || 1;
                const maxValue = parseInt(input.getAttribute('max')) || 99;
                if (currentValue < maxValue) {
                    input.value = currentValue + 1;
                    input.dispatchEvent(new Event('change'));
                }
            });
            
            input.addEventListener('input', function() {
                let value = parseInt(this.value);
                const min = parseInt(this.getAttribute('min')) || 1;
                const max = parseInt(this.getAttribute('max')) || 99;
                
                if (isNaN(value) || value < min) {
                    this.value = min;
                } else if (value > max) {
                    this.value = max;
                }
            });
        }
    });
}

// Menú móvil
function initializeMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            this.classList.toggle('active');
        });
        
        // Cerrar menú al hacer clic en un enlace
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                mobileToggle.classList.remove('active');
            });
        });
    }
}

// Sistema de notificaciones
function showNotification(message, type = 'info') {
    // Remover notificación existente
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Crear nueva notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button type="button" class="notification-close">&times;</button>
    `;
    
    // Estilos de la notificación
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        borderRadius: 'var(--border-radius)',
        color: 'white',
        fontWeight: '500',
        zIndex: '1000',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        maxWidth: '300px',
        animation: 'slideInRight 0.3s ease-out'
    });
    
    // Colores según tipo
    const colors = {
        success: 'var(--success-color)',
        error: 'var(--accent-color)',
        warning: 'var(--warning-color)',
        info: 'var(--primary-color)'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Botón de cerrar
    const closeButton = notification.querySelector('.notification-close');
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.fontSize = '20px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '0';
    closeButton.style.marginLeft = 'auto';
    
    closeButton.addEventListener('click', function() {
        notification.remove();
    });
    
    // Agregar al DOM
    document.body.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, 5000);
}

// Filtros de productos
function initializeProductFilters() {
    const filterForm = document.querySelector('.filters-form');
    const filterInputs = document.querySelectorAll('.filter-select, .filter-input');
    
    if (filterForm) {
        filterInputs.forEach(input => {
            input.addEventListener('change', function() {
                // Auto-enviar formulario cuando cambian los filtros
                filterForm.submit();
            });
        });
    }
}

// Lazy loading de imágenes
function initializeLazyLoading() {
    if ('IntersectionObserver' in window) {
        const images = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
}

// Animaciones de scroll
function initializeScrollAnimations() {
    if ('IntersectionObserver' in window) {
        const elements = document.querySelectorAll('.fade-in-on-scroll');
        
        const scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, {
            threshold: 0.1
        });
        
        elements.forEach(el => scrollObserver.observe(el));
    }
}

// Checkout process
function initializeCheckout() {
    const checkoutForm = document.querySelector('.checkout-form');
    
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            
            // Mostrar loading
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="loading"></span> Procesando...';
            
            // Aquí implementarías la integración con Stripe
            // Por ahora simulamos el proceso
            setTimeout(() => {
                fetch('/procesar-pago', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        // Datos del formulario
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        window.location.href = `/exito/${data.numero_pedido}`;
                    } else {
                        showNotification(data.error || 'Error procesando el pago', 'error');
                        submitButton.textContent = originalText;
                        submitButton.disabled = false;
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showNotification('Error procesando el pago', 'error');
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                });
            }, 2000);
        });
    }
}

// Añadir animaciones CSS para las notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .fade-in-on-scroll {
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.6s ease-out;
    }
    
    .fade-in-on-scroll.fade-in {
        opacity: 1;
        transform: translateY(0);
    }
    
    img.lazy {
        opacity: 0;
        transition: opacity 0.3s;
    }
    
    img.lazy.loaded {
        opacity: 1;
    }
`;
document.head.appendChild(style);

// Inicializar funciones adicionales después del DOM
document.addEventListener('DOMContentLoaded', function() {
    initializeProductFilters();
    initializeLazyLoading();
    initializeScrollAnimations();
    initializeCheckout();
});
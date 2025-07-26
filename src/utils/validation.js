const validator = require('validator');

/**
 * Sanitizar entrada de texto
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return validator.escape(input.trim());
}

/**
 * Validar y sanitizar parámetros de paginación
 */
function validatePagination(query) {
    const page = Math.max(1, parseInt(query.pagina) || 1);
    const limit = Math.min(Math.max(1, parseInt(query.limit) || 12), 100);
    
    return {
        page,
        limit,
        offset: (page - 1) * limit
    };
}

/**
 * Validar formato de email
 */
function validateEmail(email) {
    return validator.isEmail(email);
}

/**
 * Validar contraseña
 */
function validatePassword(password) {
    const errors = [];
    
    if (!password || password.length < 6) {
        errors.push('La contraseña debe tener al menos 6 caracteres');
    }
    
    if (password && password.length > 128) {
        errors.push('La contraseña no puede tener más de 128 caracteres');
    }
    
    if (password && !/(?=.*[a-z])/.test(password)) {
        errors.push('La contraseña debe contener al menos una letra minúscula');
    }
    
    if (password && !/(?=.*\d)/.test(password)) {
        errors.push('La contraseña debe contener al menos un número');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validar número de teléfono
 */
function validatePhone(phone) {
    if (!phone) return true; // Teléfono es opcional
    return validator.isMobilePhone(phone, 'any', { strictMode: false });
}

/**
 * Validar precio
 */
function validatePrice(price) {
    const numPrice = parseFloat(price);
    return !isNaN(numPrice) && numPrice > 0 && numPrice <= 999999.99;
}

/**
 * Validar stock
 */
function validateStock(stock) {
    const numStock = parseInt(stock);
    return !isNaN(numStock) && numStock >= 0 && numStock <= 999999;
}

/**
 * Validar datos de producto
 */
function validateProductData(data) {
    const errors = [];
    
    // Nombre
    if (!data.nombre || data.nombre.trim().length < 3) {
        errors.push('El nombre del producto debe tener al menos 3 caracteres');
    }
    
    if (data.nombre && data.nombre.length > 200) {
        errors.push('El nombre del producto no puede tener más de 200 caracteres');
    }
    
    // Descripción
    if (data.descripcion && data.descripcion.length > 1000) {
        errors.push('La descripción no puede tener más de 1000 caracteres');
    }
    
    // Precio
    if (!validatePrice(data.precio)) {
        errors.push('El precio debe ser un número válido mayor a 0');
    }
    
    // Precio de oferta (opcional)
    if (data.precio_oferta && !validatePrice(data.precio_oferta)) {
        errors.push('El precio de oferta debe ser un número válido mayor a 0');
    }
    
    // Verificar que precio de oferta sea menor al precio regular
    if (data.precio_oferta && data.precio && parseFloat(data.precio_oferta) >= parseFloat(data.precio)) {
        errors.push('El precio de oferta debe ser menor al precio regular');
    }
    
    // Stock
    if (data.stock !== undefined && !validateStock(data.stock)) {
        errors.push('El stock debe ser un número entero no negativo');
    }
    
    // Categoría
    if (!data.categoria_id || isNaN(parseInt(data.categoria_id))) {
        errors.push('Debe seleccionar una categoría válida');
    }
    
    // Género
    const validGenders = ['hombre', 'mujer', 'unisex'];
    if (data.genero && !validGenders.includes(data.genero)) {
        errors.push('El género debe ser uno de: hombre, mujer, unisex');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validar datos de usuario
 */
function validateUserData(data) {
    const errors = [];
    
    // Nombre
    if (!data.nombre || data.nombre.trim().length < 2) {
        errors.push('El nombre debe tener al menos 2 caracteres');
    }
    
    if (data.nombre && data.nombre.length > 100) {
        errors.push('El nombre no puede tener más de 100 caracteres');
    }
    
    // Apellido
    if (!data.apellido || data.apellido.trim().length < 2) {
        errors.push('El apellido debe tener al menos 2 caracteres');
    }
    
    if (data.apellido && data.apellido.length > 100) {
        errors.push('El apellido no puede tener más de 100 caracteres');
    }
    
    // Email
    if (!data.email || !validateEmail(data.email)) {
        errors.push('Debe proporcionar un email válido');
    }
    
    // Contraseña (solo para registro)
    if (data.password) {
        const passwordValidation = validatePassword(data.password);
        if (!passwordValidation.isValid) {
            errors.push(...passwordValidation.errors);
        }
    }
    
    // Teléfono (opcional)
    if (data.telefono && !validatePhone(data.telefono)) {
        errors.push('El formato del teléfono no es válido');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Limpiar datos de usuario para respuestas
 */
function sanitizeUserData(user) {
    const { password_hash, ...cleanUser } = user;
    return cleanUser;
}

/**
 * Validar archivos de imagen
 */
function validateImageFile(file) {
    const errors = [];
    
    if (!file) {
        return { isValid: true, errors }; // Imagen es opcional
    }
    
    // Verificar tipo de archivo
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
        errors.push('Solo se permiten archivos de imagen (JPEG, PNG, WebP)');
    }
    
    // Verificar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        errors.push('El archivo no puede ser mayor a 5MB');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Generar slug para URLs amigables
 */
function generateSlug(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remover caracteres especiales
        .replace(/[\s_-]+/g, '-') // Reemplazar espacios y guiones con un solo guión
        .replace(/^-+|-+$/g, ''); // Remover guiones al inicio y final
}

/**
 * Validar datos de dirección
 */
function validateAddressData(data) {
    const errors = [];
    
    if (!data.direccion || data.direccion.trim().length < 5) {
        errors.push('La dirección debe tener al menos 5 caracteres');
    }
    
    if (!data.ciudad || data.ciudad.trim().length < 2) {
        errors.push('La ciudad es obligatoria');
    }
    
    if (!data.codigo_postal || !/^\d{5}$/.test(data.codigo_postal)) {
        errors.push('El código postal debe tener 5 dígitos');
    }
    
    if (data.telefono && !validatePhone(data.telefono)) {
        errors.push('El formato del teléfono no es válido');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

module.exports = {
    sanitizeInput,
    validatePagination,
    validateEmail,
    validatePassword,
    validatePhone,
    validatePrice,
    validateStock,
    validateProductData,
    validateUserData,
    sanitizeUserData,
    validateImageFile,
    generateSlug,
    validateAddressData
};
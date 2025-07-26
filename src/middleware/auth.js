const User = require('../models/User');

/**
 * Middleware para verificar si el usuario está autenticado
 */
const requireAuth = (req, res, next) => {
    if (!req.session.usuario) {
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            // Si es una petición AJAX, devolver JSON
            return res.status(401).json({
                success: false,
                message: 'Debe iniciar sesión para acceder a este recurso',
                redirectTo: '/login'
            });
        } else {
            // Si es una petición normal, redirigir al login
            const redirectUrl = req.originalUrl !== '/login' ? req.originalUrl : '/';
            return res.redirect(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
        }
    }
    next();
};

/**
 * Middleware para verificar si el usuario es administrador
 */
const requireAdmin = (req, res, next) => {
    if (!req.session.usuario) {
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(401).json({
                success: false,
                message: 'Debe iniciar sesión como administrador'
            });
        } else {
            return res.redirect('/login');
        }
    }

    if (!req.session.usuario.es_admin) {
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(403).json({
                success: false,
                message: 'No tiene permisos de administrador'
            });
        } else {
            return res.status(403).render('403', {
                titulo: 'Acceso Denegado',
                message: 'No tiene permisos para acceder a esta página'
            });
        }
    }

    next();
};

/**
 * Middleware opcional de autenticación (no redirige si no está autenticado)
 */
const optionalAuth = (req, res, next) => {
    // Solo establece el usuario en locals si existe
    res.locals.usuario = req.session.usuario || null;
    res.locals.esAdmin = req.session.usuario ? req.session.usuario.es_admin : false;
    next();
};

/**
 * Middleware para verificar la validez de la sesión
 */
const validateSession = async (req, res, next) => {
    if (req.session.usuario) {
        try {
            // Verificar que el usuario aún existe y está activo
            const user = await User.findById(req.session.usuario.id);
            
            if (!user || !user.activo) {
                // Usuario no existe o está desactivado, limpiar sesión
                req.session.destroy((err) => {
                    if (err) console.error('Error destroying session:', err);
                });
                res.locals.usuario = null;
                res.locals.esAdmin = false;
            } else {
                // Usuario válido, actualizar datos de sesión si es necesario
                if (user.es_admin !== req.session.usuario.es_admin) {
                    req.session.usuario.es_admin = user.es_admin;
                }
                res.locals.usuario = req.session.usuario;
                res.locals.esAdmin = user.es_admin;
            }
        } catch (error) {
            console.error('Error validating session:', error);
            // En caso de error, mantener la sesión pero no establecer permisos de admin
            res.locals.usuario = req.session.usuario;
            res.locals.esAdmin = false;
        }
    } else {
        res.locals.usuario = null;
        res.locals.esAdmin = false;
    }
    
    next();
};

/**
 * Middleware para prevenir acceso de usuarios ya autenticados a páginas de login/registro
 */
const redirectIfAuthenticated = (req, res, next) => {
    if (req.session.usuario) {
        const redirectTo = req.query.redirect || '/';
        return res.redirect(redirectTo);
    }
    next();
};

/**
 * Middleware para verificar permisos sobre recursos específicos
 */
const checkResourcePermission = (resourceType) => {
    return async (req, res, next) => {
        const user = req.session.usuario;
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Debe iniciar sesión'
            });
        }

        // Los administradores tienen acceso a todo
        if (user.es_admin) {
            return next();
        }

        // Verificar permisos específicos según el tipo de recurso
        switch (resourceType) {
            case 'profile':
                // Los usuarios pueden acceder a su propio perfil
                const userId = parseInt(req.params.userId || req.params.id);
                if (userId !== user.id) {
                    return res.status(403).json({
                        success: false,
                        message: 'No puede acceder a este perfil'
                    });
                }
                break;
                
            case 'orders':
                // Los usuarios pueden ver sus propios pedidos
                const orderUserId = parseInt(req.params.userId);
                if (orderUserId && orderUserId !== user.id) {
                    return res.status(403).json({
                        success: false,
                        message: 'No puede acceder a estos pedidos'
                    });
                }
                break;
                
            default:
                return res.status(403).json({
                    success: false,
                    message: 'Acceso denegado'
                });
        }

        next();
    };
};

/**
 * Middleware para limitar intentos de login
 */
const rateLimitLogin = (() => {
    const attempts = new Map();
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos

    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const userAttempts = attempts.get(ip);

        if (userAttempts) {
            const { count, firstAttempt, lockedUntil } = userAttempts;

            // Si está bloqueado
            if (lockedUntil && now < lockedUntil) {
                const remainingTime = Math.ceil((lockedUntil - now) / 1000 / 60);
                return res.status(429).json({
                    success: false,
                    message: `Demasiados intentos de login. Intente nuevamente en ${remainingTime} minutos.`
                });
            }

            // Resetear contador si ha pasado el tiempo de bloqueo
            if (lockedUntil && now >= lockedUntil) {
                attempts.delete(ip);
            } else if (count >= MAX_ATTEMPTS) {
                // Bloquear si se exceden los intentos
                attempts.set(ip, {
                    count: count + 1,
                    firstAttempt,
                    lockedUntil: now + LOCKOUT_TIME
                });
                return res.status(429).json({
                    success: false,
                    message: 'Demasiados intentos de login. Cuenta bloqueada temporalmente.'
                });
            }
        }

        // Agregar método para registrar intento fallido
        req.recordFailedLogin = () => {
            const userAttempts = attempts.get(ip) || { count: 0, firstAttempt: now };
            attempts.set(ip, {
                count: userAttempts.count + 1,
                firstAttempt: userAttempts.firstAttempt,
                lockedUntil: null
            });
        };

        // Agregar método para resetear intentos
        req.clearLoginAttempts = () => {
            attempts.delete(ip);
        };

        next();
    };
})();

/**
 * Middleware para logging de actividad de usuarios
 */
const logUserActivity = (action) => {
    return (req, res, next) => {
        if (req.session.usuario) {
            // Aquí podrías implementar logging a base de datos
            console.log(`User ${req.session.usuario.id} performed action: ${action} at ${new Date().toISOString()}`);
        }
        next();
    };
};

module.exports = {
    requireAuth,
    requireAdmin,
    optionalAuth,
    validateSession,
    redirectIfAuthenticated,
    checkResourcePermission,
    rateLimitLogin,
    logUserActivity
};
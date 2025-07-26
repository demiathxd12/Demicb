const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

// Importar configuración
const database = require('./src/config/database');

// Importar middleware
const {
    setupSecurity,
    setupSessions,
    setupParsing,
    setupStatic,
    setupViews,
    setupLogging,
    errorHandler
} = require('./src/middleware/setup');

const { validateSession } = require('./src/middleware/auth');
const cartMiddleware = require('./src/middleware/cart');

// Importar rutas
const webRoutes = require('./src/routes/web');
const apiRoutes = require('./src/routes/api');

// Crear aplicación Express
const app = express();

// Configurar trust proxy para obtener IP real detrás de proxies/load balancers
app.set('trust proxy', true);

// Configurar middleware de seguridad
setupSecurity(app);

// Configurar logging
setupLogging(app);

// Configurar parsing de datos
setupParsing(app);

// Configurar archivos estáticos
setupStatic(app);

// Configurar motor de vistas
setupViews(app);

// Configurar sesiones
setupSessions(app);

// Middleware global para validar sesiones
app.use(validateSession);

// Middleware para carrito
app.use(cartMiddleware);

// Rutas
app.use('/', webRoutes);
app.use('/api', apiRoutes);

// Middleware para manejo de errores 404
app.use((req, res) => {
    res.status(404).render('404', {
        titulo: 'Página no encontrada',
        message: 'La página que buscas no existe'
    });
});

// Middleware para manejo de errores del servidor
app.use(errorHandler);

// Función para inicializar la aplicación
async function initializeApp() {
    try {
        // Verificar conexión a la base de datos
        const dbConnected = await database.testConnection();
        if (!dbConnected) {
            console.error('❌ No se pudo conectar a la base de datos');
            process.exit(1);
        }

        const PORT = process.env.PORT || 3000;
        
        app.listen(PORT, () => {
            console.log('🚀 Servidor iniciado correctamente');
            console.log(`🌐 URL: http://localhost:${PORT}`);
            console.log(`📊 Base de datos: ${process.env.DB_NAME || 'tienda_ropa'}`);
            console.log(`🔒 Modo: ${process.env.NODE_ENV || 'development'}`);
            console.log('─'.repeat(50));
        });
    } catch (error) {
        console.error('❌ Error inicializando la aplicación:', error);
        process.exit(1);
    }
}

// Manejar cierre graceful de la aplicación
process.on('SIGTERM', async () => {
    console.log('📴 Cerrando servidor...');
    await database.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('📴 Cerrando servidor...');
    await database.close();
    process.exit(0);
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
    process.exit(1);
});

// Inicializar la aplicación
if (require.main === module) {
    initializeApp();
}

module.exports = app;
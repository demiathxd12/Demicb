const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

const app = express();

// Configuración de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            frameSrc: ["https://js.stripe.com"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // máximo 100 requests por IP
});
app.use(limiter);

// Configuración de CORS
app.use(cors());

// Configuración del motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurar express-ejs-layouts para el layout
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'secreto_por_defecto',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // cambiar a true en producción con HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tienda_ropa',
    charset: 'utf8mb4'
};

let db;

function conectarDB() {
    db = mysql.createConnection(dbConfig);
    
    db.connect((err) => {
        if (err) {
            console.error('Error conectando a la base de datos:', err);
            setTimeout(conectarDB, 2000);
        } else {
            console.log('Conectado a la base de datos MySQL');
        }
    });

    db.on('error', (err) => {
        console.error('Error de base de datos:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            conectarDB();
        } else {
            throw err;
        }
    });
}

conectarDB();

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, 'public/uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'), false);
        }
    }
});

// Middleware para hacer la sesión disponible en todas las vistas
app.use((req, res, next) => {
    res.locals.usuario = req.session.usuario || null;
    res.locals.esAdmin = req.session.usuario ? req.session.usuario.es_admin : false;
    next();
});

// Middleware para obtener el carrito
function obtenerCarrito(req, res, next) {
    const sessionId = req.session.id;
    const usuarioId = req.session.usuario ? req.session.usuario.id : null;
    
    let query = `
        SELECT c.id as carrito_id, ci.*, p.nombre, p.imagen_principal, p.precio
        FROM carritos c
        LEFT JOIN carrito_items ci ON c.id = ci.carrito_id
        LEFT JOIN productos p ON ci.producto_id = p.id
        WHERE `;
    
    let params = [];
    if (usuarioId) {
        query += 'c.usuario_id = ?';
        params.push(usuarioId);
    } else {
        query += 'c.session_id = ?';
        params.push(sessionId);
    }
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error obteniendo carrito:', err);
            res.locals.carrito = [];
            res.locals.totalCarrito = 0;
        } else {
            res.locals.carrito = results.filter(item => item.producto_id);
            res.locals.totalCarrito = results.reduce((total, item) => {
                return total + (item.cantidad * item.precio_unitario);
            }, 0);
        }
        next();
    });
}

app.use(obtenerCarrito);

// RUTAS PRINCIPALES

// Página de inicio
app.get('/', (req, res) => {
    // Obtener productos destacados
    const queryDestacados = 'SELECT * FROM productos WHERE destacado = TRUE AND activo = TRUE LIMIT 8';
    
    // Obtener categorías
    const queryCategorias = 'SELECT * FROM categorias WHERE activa = TRUE';
    
    db.query(queryDestacados, (err, productosDestacados) => {
        if (err) {
            console.error('Error obteniendo productos destacados:', err);
            productosDestacados = [];
        }
        
        db.query(queryCategorias, (err, categorias) => {
            if (err) {
                console.error('Error obteniendo categorías:', err);
                categorias = [];
            }
            
            res.render('index', {
                titulo: 'Tienda de Ropa Online',
                productosDestacados: productosDestacados,
                categorias: categorias
            });
        });
    });
});

// Catálogo de productos
app.get('/productos', (req, res) => {
    const categoria = req.query.categoria || '';
    const genero = req.query.genero || '';
    const busqueda = req.query.q || '';
    const orden = req.query.orden || 'fecha_desc';
    const pagina = parseInt(req.query.pagina) || 1;
    const productosPorPagina = 12;
    const offset = (pagina - 1) * productosPorPagina;
    
    let whereConditions = ['p.activo = TRUE'];
    let params = [];
    
    if (categoria) {
        whereConditions.push('c.nombre = ?');
        params.push(categoria);
    }
    
    if (genero) {
        whereConditions.push('p.genero = ?');
        params.push(genero);
    }
    
    if (busqueda) {
        whereConditions.push('(p.nombre LIKE ? OR p.descripcion LIKE ?)');
        params.push(`%${busqueda}%`, `%${busqueda}%`);
    }
    
    let orderBy = '';
    switch (orden) {
        case 'precio_asc':
            orderBy = 'ORDER BY p.precio ASC';
            break;
        case 'precio_desc':
            orderBy = 'ORDER BY p.precio DESC';
            break;
        case 'nombre':
            orderBy = 'ORDER BY p.nombre ASC';
            break;
        default:
            orderBy = 'ORDER BY p.fecha_creacion DESC';
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    const queryProductos = `
        SELECT p.*, c.nombre as categoria_nombre
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        ${whereClause}
        ${orderBy}
        LIMIT ? OFFSET ?
    `;
    
    const queryTotal = `
        SELECT COUNT(*) as total
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        ${whereClause}
    `;
    
    params.push(productosPorPagina, offset);
    
    db.query(queryProductos, params, (err, productos) => {
        if (err) {
            console.error('Error obteniendo productos:', err);
            return res.status(500).send('Error del servidor');
        }
        
        // Parsear JSON de tallas y colores
        productos.forEach(producto => {
            try {
                producto.tallas = JSON.parse(producto.tallas || '[]');
                producto.colores = JSON.parse(producto.colores || '[]');
            } catch (e) {
                producto.tallas = [];
                producto.colores = [];
            }
        });
        
        // Obtener total para paginación
        const paramsTotal = params.slice(0, -2); // quitar LIMIT y OFFSET
        db.query(queryTotal, paramsTotal, (err, totalResult) => {
            if (err) {
                console.error('Error obteniendo total:', err);
                return res.status(500).send('Error del servidor');
            }
            
            const total = totalResult[0].total;
            const totalPaginas = Math.ceil(total / productosPorPagina);
            
            // Obtener categorías para el filtro
            db.query('SELECT * FROM categorias WHERE activa = TRUE', (err, categorias) => {
                if (err) {
                    console.error('Error obteniendo categorías:', err);
                    categorias = [];
                }
                
                res.render('productos', {
                    titulo: 'Catálogo de Productos',
                    productos: productos,
                    categorias: categorias,
                    filtros: { categoria, genero, busqueda, orden },
                    paginacion: {
                        paginaActual: pagina,
                        totalPaginas: totalPaginas,
                        total: total
                    }
                });
            });
        });
    });
});

// Detalle de producto
app.get('/producto/:id', (req, res) => {
    const productoId = req.params.id;
    
    const queryProducto = `
        SELECT p.*, c.nombre as categoria_nombre
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE p.id = ? AND p.activo = TRUE
    `;
    
    db.query(queryProducto, [productoId], (err, productos) => {
        if (err) {
            console.error('Error obteniendo producto:', err);
            return res.status(500).send('Error del servidor');
        }
        
        if (productos.length === 0) {
            return res.status(404).send('Producto no encontrado');
        }
        
        const producto = productos[0];
        
        // Parsear JSON
        try {
            producto.tallas = JSON.parse(producto.tallas || '[]');
            producto.colores = JSON.parse(producto.colores || '[]');
            producto.imagenes_adicionales = JSON.parse(producto.imagenes_adicionales || '[]');
        } catch (e) {
            producto.tallas = [];
            producto.colores = [];
            producto.imagenes_adicionales = [];
        }
        
        // Obtener reseñas
        const queryResenas = `
            SELECT r.*, u.nombre, u.apellido
            FROM resenas r
            JOIN usuarios u ON r.usuario_id = u.id
            WHERE r.producto_id = ?
            ORDER BY r.fecha_creacion DESC
        `;
        
        db.query(queryResenas, [productoId], (err, resenas) => {
            if (err) {
                console.error('Error obteniendo reseñas:', err);
                resenas = [];
            }
            
            // Calcular promedio de calificaciones
            const promedioCalificacion = resenas.length > 0 
                ? resenas.reduce((sum, r) => sum + r.calificacion, 0) / resenas.length 
                : 0;
            
            res.render('producto-detalle', {
                titulo: producto.nombre,
                producto: producto,
                resenas: resenas,
                promedioCalificacion: promedioCalificacion.toFixed(1)
            });
        });
    });
});

// Agregar al carrito
app.post('/carrito/agregar', (req, res) => {
    const { producto_id, cantidad, talla, color } = req.body;
    const sessionId = req.session.id;
    const usuarioId = req.session.usuario ? req.session.usuario.id : null;
    
    if (!producto_id || !cantidad) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }
    
    // Verificar que el producto existe y obtener su precio
    db.query('SELECT precio FROM productos WHERE id = ? AND activo = TRUE', [producto_id], (err, productos) => {
        if (err || productos.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const precio = productos[0].precio;
        
        // Buscar o crear carrito
        let queryCarrito = 'SELECT id FROM carritos WHERE ';
        let paramsCarrito = [];
        
        if (usuarioId) {
            queryCarrito += 'usuario_id = ?';
            paramsCarrito.push(usuarioId);
        } else {
            queryCarrito += 'session_id = ?';
            paramsCarrito.push(sessionId);
        }
        
        db.query(queryCarrito, paramsCarrito, (err, carritos) => {
            if (err) {
                console.error('Error buscando carrito:', err);
                return res.status(500).json({ error: 'Error del servidor' });
            }
            
            let carritoId;
            
            if (carritos.length > 0) {
                carritoId = carritos[0].id;
                agregarItem();
            } else {
                // Crear nuevo carrito
                const insertCarrito = 'INSERT INTO carritos (usuario_id, session_id) VALUES (?, ?)';
                db.query(insertCarrito, [usuarioId, sessionId], (err, result) => {
                    if (err) {
                        console.error('Error creando carrito:', err);
                        return res.status(500).json({ error: 'Error del servidor' });
                    }
                    carritoId = result.insertId;
                    agregarItem();
                });
            }
            
            function agregarItem() {
                // Verificar si ya existe el item con la misma talla y color
                const queryExiste = `
                    SELECT id, cantidad FROM carrito_items 
                    WHERE carrito_id = ? AND producto_id = ? AND talla = ? AND color = ?
                `;
                
                db.query(queryExiste, [carritoId, producto_id, talla || '', color || ''], (err, items) => {
                    if (err) {
                        console.error('Error verificando item:', err);
                        return res.status(500).json({ error: 'Error del servidor' });
                    }
                    
                    if (items.length > 0) {
                        // Actualizar cantidad
                        const nuevaCantidad = parseInt(items[0].cantidad) + parseInt(cantidad);
                        const updateItem = 'UPDATE carrito_items SET cantidad = ? WHERE id = ?';
                        
                        db.query(updateItem, [nuevaCantidad, items[0].id], (err) => {
                            if (err) {
                                console.error('Error actualizando item:', err);
                                return res.status(500).json({ error: 'Error del servidor' });
                            }
                            res.json({ success: true, mensaje: 'Cantidad actualizada en el carrito' });
                        });
                    } else {
                        // Insertar nuevo item
                        const insertItem = `
                            INSERT INTO carrito_items (carrito_id, producto_id, cantidad, talla, color, precio_unitario)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `;
                        
                        db.query(insertItem, [carritoId, producto_id, cantidad, talla || '', color || '', precio], (err) => {
                            if (err) {
                                console.error('Error insertando item:', err);
                                return res.status(500).json({ error: 'Error del servidor' });
                            }
                            res.json({ success: true, mensaje: 'Producto agregado al carrito' });
                        });
                    }
                });
            }
        });
    });
});

// Ver carrito
app.get('/carrito', (req, res) => {
    res.render('carrito', {
        titulo: 'Mi Carrito'
    });
});

// Actualizar cantidad en carrito
app.post('/carrito/actualizar', (req, res) => {
    const { item_id, cantidad } = req.body;
    
    if (!item_id || !cantidad || cantidad < 1) {
        return res.status(400).json({ error: 'Datos inválidos' });
    }
    
    db.query('UPDATE carrito_items SET cantidad = ? WHERE id = ?', [cantidad, item_id], (err) => {
        if (err) {
            console.error('Error actualizando carrito:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        res.json({ success: true });
    });
});

// Eliminar del carrito
app.post('/carrito/eliminar', (req, res) => {
    const { item_id } = req.body;
    
    db.query('DELETE FROM carrito_items WHERE id = ?', [item_id], (err) => {
        if (err) {
            console.error('Error eliminando del carrito:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        res.json({ success: true });
    });
});

// Registro de usuario
app.get('/registro', (req, res) => {
    res.render('registro', {
        titulo: 'Crear Cuenta'
    });
});

app.post('/registro', (req, res) => {
    const { nombre, apellido, email, password, telefono } = req.body;
    
    if (!nombre || !apellido || !email || !password) {
        return res.render('registro', {
            titulo: 'Crear Cuenta',
            error: 'Todos los campos son obligatorios'
        });
    }
    
    // Verificar si el email ya existe
    db.query('SELECT id FROM usuarios WHERE email = ?', [email], (err, usuarios) => {
        if (err) {
            console.error('Error verificando email:', err);
            return res.render('registro', {
                titulo: 'Crear Cuenta',
                error: 'Error del servidor'
            });
        }
        
        if (usuarios.length > 0) {
            return res.render('registro', {
                titulo: 'Crear Cuenta',
                error: 'El email ya está registrado'
            });
        }
        
        // Encriptar contraseña
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                console.error('Error encriptando contraseña:', err);
                return res.render('registro', {
                    titulo: 'Crear Cuenta',
                    error: 'Error del servidor'
                });
            }
            
            // Insertar usuario
            const insertUser = `
                INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            db.query(insertUser, [nombre, apellido, email, hash, telefono], (err, result) => {
                if (err) {
                    console.error('Error creando usuario:', err);
                    return res.render('registro', {
                        titulo: 'Crear Cuenta',
                        error: 'Error del servidor'
                    });
                }
                
                // Iniciar sesión automáticamente
                req.session.usuario = {
                    id: result.insertId,
                    nombre: nombre,
                    apellido: apellido,
                    email: email,
                    es_admin: false
                };
                
                res.redirect('/');
            });
        });
    });
});

// Login
app.get('/login', (req, res) => {
    res.render('login', {
        titulo: 'Iniciar Sesión'
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.render('login', {
            titulo: 'Iniciar Sesión',
            error: 'Email y contraseña son obligatorios'
        });
    }
    
    db.query('SELECT * FROM usuarios WHERE email = ? AND activo = TRUE', [email], (err, usuarios) => {
        if (err) {
            console.error('Error en login:', err);
            return res.render('login', {
                titulo: 'Iniciar Sesión',
                error: 'Error del servidor'
            });
        }
        
        if (usuarios.length === 0) {
            return res.render('login', {
                titulo: 'Iniciar Sesión',
                error: 'Credenciales inválidas'
            });
        }
        
        const usuario = usuarios[0];
        
        bcrypt.compare(password, usuario.password_hash, (err, match) => {
            if (err) {
                console.error('Error comparando contraseña:', err);
                return res.render('login', {
                    titulo: 'Iniciar Sesión',
                    error: 'Error del servidor'
                });
            }
            
            if (!match) {
                return res.render('login', {
                    titulo: 'Iniciar Sesión',
                    error: 'Credenciales inválidas'
                });
            }
            
            // Actualizar último acceso
            db.query('UPDATE usuarios SET fecha_ultimo_acceso = NOW() WHERE id = ?', [usuario.id]);
            
            // Iniciar sesión
            req.session.usuario = {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                es_admin: usuario.es_admin
            };
            
            res.redirect('/');
        });
    });
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error en logout:', err);
        }
        res.redirect('/');
    });
});

// Checkout
app.get('/checkout', (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    
    res.render('checkout', {
        titulo: 'Finalizar Compra'
    });
});

// Procesar pago
app.post('/procesar-pago', (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).json({ error: 'Debe iniciar sesión' });
    }
    
    // Aquí implementarías la integración con Stripe
    // Por ahora simulamos un pago exitoso
    
    const usuarioId = req.session.usuario.id;
    const numeroPedido = 'PED-' + Date.now();
    
    // Obtener items del carrito
    const queryCarrito = `
        SELECT ci.*, p.nombre
        FROM carritos c
        JOIN carrito_items ci ON c.id = ci.carrito_id
        JOIN productos p ON ci.producto_id = p.id
        WHERE c.usuario_id = ?
    `;
    
    db.query(queryCarrito, [usuarioId], (err, items) => {
        if (err || items.length === 0) {
            return res.status(400).json({ error: 'Carrito vacío' });
        }
        
        const subtotal = items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
        const envio = 100; // $100 de envío
        const total = subtotal + envio;
        
        // Crear pedido
        const insertPedido = `
            INSERT INTO pedidos (usuario_id, numero_pedido, subtotal, envio, total, estado, metodo_pago)
            VALUES (?, ?, ?, ?, ?, 'confirmado', 'tarjeta')
        `;
        
        db.query(insertPedido, [usuarioId, numeroPedido, subtotal, envio, total], (err, result) => {
            if (err) {
                console.error('Error creando pedido:', err);
                return res.status(500).json({ error: 'Error del servidor' });
            }
            
            const pedidoId = result.insertId;
            
            // Insertar items del pedido
            const insertItems = items.map(item => {
                return new Promise((resolve, reject) => {
                    const insertItem = `
                        INSERT INTO pedido_items (pedido_id, producto_id, nombre_producto, cantidad, talla, color, precio_unitario, subtotal)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    
                    const subtotalItem = item.cantidad * item.precio_unitario;
                    
                    db.query(insertItem, [
                        pedidoId, item.producto_id, item.nombre, item.cantidad,
                        item.talla, item.color, item.precio_unitario, subtotalItem
                    ], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });
            
            Promise.all(insertItems)
                .then(() => {
                    // Limpiar carrito
                    db.query('DELETE ci FROM carrito_items ci JOIN carritos c ON ci.carrito_id = c.id WHERE c.usuario_id = ?', [usuarioId], (err) => {
                        if (err) console.error('Error limpiando carrito:', err);
                    });
                    
                    res.json({ 
                        success: true, 
                        pedido_id: pedidoId,
                        numero_pedido: numeroPedido
                    });
                })
                .catch(err => {
                    console.error('Error insertando items:', err);
                    res.status(500).json({ error: 'Error del servidor' });
                });
        });
    });
});

// Página de éxito
app.get('/exito/:numero_pedido?', (req, res) => {
    const numeroPedido = req.params.numero_pedido;
    res.render('exito', {
        titulo: 'Compra Exitosa',
        numeroPedido: numeroPedido
    });
});

// Página de cancelado
app.get('/cancelado', (req, res) => {
    res.render('cancelado', {
        titulo: 'Compra Cancelada'
    });
});

// Mi cuenta
app.get('/mi-cuenta', (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    
    const usuarioId = req.session.usuario.id;
    
    // Obtener pedidos del usuario
    const queryPedidos = `
        SELECT * FROM pedidos 
        WHERE usuario_id = ? 
        ORDER BY fecha_pedido DESC
    `;
    
    db.query(queryPedidos, [usuarioId], (err, pedidos) => {
        if (err) {
            console.error('Error obteniendo pedidos:', err);
            pedidos = [];
        }
        
        res.render('mi-cuenta', {
            titulo: 'Mi Cuenta',
            pedidos: pedidos
        });
    });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).render('404', {
        titulo: 'Página no encontrada'
    });
});

// Manejo de errores del servidor
app.use((err, req, res, next) => {
    console.error('Error del servidor:', err);
    res.status(500).render('500', {
        titulo: 'Error del servidor'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Visita: http://localhost:${PORT}`);
});
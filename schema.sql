-- Base de datos para tienda de ropa online
CREATE DATABASE IF NOT EXISTS tienda_ropa;
USE tienda_ropa;

-- Tabla de categorías
CREATE TABLE categorias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    imagen VARCHAR(255),
    activa BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de productos
CREATE TABLE productos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    precio_oferta DECIMAL(10,2),
    categoria_id INT,
    tallas JSON, -- ['XS', 'S', 'M', 'L', 'XL']
    colores JSON, -- ['Rojo', 'Azul', 'Negro']
    material VARCHAR(100),
    genero ENUM('hombre', 'mujer', 'unisex') DEFAULT 'unisex',
    stock INT DEFAULT 0,
    imagen_principal VARCHAR(255),
    imagenes_adicionales JSON,
    activo BOOLEAN DEFAULT TRUE,
    destacado BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- Tabla de usuarios
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    fecha_nacimiento DATE,
    genero ENUM('masculino', 'femenino', 'otro'),
    activo BOOLEAN DEFAULT TRUE,
    es_admin BOOLEAN DEFAULT FALSE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_ultimo_acceso TIMESTAMP
);

-- Tabla de direcciones
CREATE TABLE direcciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    tipo ENUM('envio', 'facturacion') DEFAULT 'envio',
    nombre_completo VARCHAR(200),
    direccion VARCHAR(255) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    estado_provincia VARCHAR(100),
    codigo_postal VARCHAR(20) NOT NULL,
    pais VARCHAR(100) DEFAULT 'México',
    telefono VARCHAR(20),
    es_principal BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla de carritos
CREATE TABLE carritos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT,
    session_id VARCHAR(255),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla de items del carrito
CREATE TABLE carrito_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    carrito_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    talla VARCHAR(10),
    color VARCHAR(50),
    precio_unitario DECIMAL(10,2) NOT NULL,
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (carrito_id) REFERENCES carritos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Tabla de pedidos
CREATE TABLE pedidos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    numero_pedido VARCHAR(50) UNIQUE NOT NULL,
    estado ENUM('pendiente', 'confirmado', 'procesando', 'enviado', 'entregado', 'cancelado') DEFAULT 'pendiente',
    subtotal DECIMAL(10,2) NOT NULL,
    impuestos DECIMAL(10,2) DEFAULT 0,
    envio DECIMAL(10,2) DEFAULT 0,
    descuento DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    metodo_pago VARCHAR(50),
    id_transaccion VARCHAR(255),
    direccion_envio JSON,
    direccion_facturacion JSON,
    notas TEXT,
    fecha_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_confirmacion TIMESTAMP,
    fecha_envio TIMESTAMP,
    fecha_entrega TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabla de items del pedido
CREATE TABLE pedido_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    nombre_producto VARCHAR(200) NOT NULL,
    cantidad INT NOT NULL,
    talla VARCHAR(10),
    color VARCHAR(50),
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Tabla de reseñas
CREATE TABLE resenas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    producto_id INT NOT NULL,
    usuario_id INT NOT NULL,
    calificacion INT NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
    titulo VARCHAR(200),
    comentario TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verificada BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_review (producto_id, usuario_id)
);

-- Tabla de cupones de descuento
CREATE TABLE cupones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200),
    tipo ENUM('porcentaje', 'fijo') NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    minimo_compra DECIMAL(10,2) DEFAULT 0,
    usos_maximos INT DEFAULT 1,
    usos_actuales INT DEFAULT 0,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar categorías iniciales
INSERT INTO categorias (nombre, descripcion) VALUES
('Camisetas', 'Camisetas y tops para todas las ocasiones'),
('Pantalones', 'Pantalones, jeans y leggins'),
('Vestidos', 'Vestidos elegantes y casuales'),
('Chaquetas', 'Chaquetas, abrigos y suéteres'),
('Zapatos', 'Calzado deportivo y formal'),
('Accesorios', 'Bolsos, cinturones y complementos'),
('Ropa Interior', 'Lencería y ropa interior'),
('Deportiva', 'Ropa deportiva y activewear');

-- Insertar productos de ejemplo
INSERT INTO productos (nombre, descripcion, precio, categoria_id, tallas, colores, material, genero, stock, imagen_principal, destacado) VALUES
('Camiseta Básica Algodón', 'Camiseta básica de algodón 100% orgánico, perfecta para el día a día', 299.00, 1, '["XS", "S", "M", "L", "XL"]', '["Blanco", "Negro", "Gris", "Azul Marino"]', 'Algodón 100%', 'unisex', 50, '/images/productos/camiseta-basica.jpg', TRUE),
('Jean Skinny Premium', 'Jean skinny de mezclilla premium con stretch, corte moderno y cómodo', 899.00, 2, '["26", "28", "30", "32", "34", "36"]', '["Azul Oscuro", "Negro", "Azul Claro"]', 'Mezclilla 98% Algodón, 2% Elastano', 'mujer', 30, '/images/productos/jean-skinny.jpg', TRUE),
('Vestido Casual Floral', 'Vestido casual con estampado floral, ideal para primavera y verano', 699.00, 3, '["XS", "S", "M", "L", "XL"]', '["Floral Rosa", "Floral Azul", "Floral Amarillo"]', 'Viscosa', 'mujer', 25, '/images/productos/vestido-floral.jpg', FALSE),
('Hoodie Premium', 'Sudadera con capucha de algodón premium, diseño minimalista', 799.00, 4, '["S", "M", "L", "XL", "XXL"]', '["Negro", "Gris", "Blanco", "Azul Marino"]', 'Algodón 80%, Poliéster 20%', 'unisex', 40, '/images/productos/hoodie-premium.jpg', TRUE),
('Tenis Deportivos', 'Tenis deportivos con tecnología de amortiguación y diseño moderno', 1299.00, 5, '["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"]', '["Blanco", "Negro", "Azul", "Rosa"]', 'Sintético y Malla', 'unisex', 35, '/images/productos/tenis-deportivos.jpg', FALSE);

-- Crear usuario administrador por defecto
INSERT INTO usuarios (nombre, apellido, email, password_hash, es_admin) VALUES
('Admin', 'Sistema', 'admin@tienda.com', '$2b$10$example.hash.here', TRUE);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_activo ON productos(activo);
CREATE INDEX idx_productos_destacado ON productos(destacado);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_fecha ON pedidos(fecha_pedido);
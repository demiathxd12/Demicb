const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tienda_ropa',
    charset: 'utf8mb4',
    multipleStatements: true
};

const db = mysql.createConnection(dbConfig);

async function setupDatabase() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        
        // Crear hash para la contraseña del admin
        const adminPassword = await bcrypt.hash('admin123', 10);
        
        console.log('📦 Insertando datos de ejemplo...');
        
        // Insertar categorías
        const categorias = [
            ['Camisetas', 'Camisetas y tops para todas las ocasiones'],
            ['Pantalones', 'Pantalones, jeans y leggins'],
            ['Vestidos', 'Vestidos elegantes y casuales'],
            ['Chaquetas', 'Chaquetas, abrigos y suéteres'],
            ['Zapatos', 'Calzado deportivo y formal'],
            ['Accesorios', 'Bolsos, cinturones y complementos'],
            ['Ropa Interior', 'Lencería y ropa interior'],
            ['Deportiva', 'Ropa deportiva y activewear']
        ];
        
        for (const [nombre, descripcion] of categorias) {
            await new Promise((resolve, reject) => {
                db.query(
                    'INSERT IGNORE INTO categorias (nombre, descripcion) VALUES (?, ?)',
                    [nombre, descripcion],
                    (err, result) => err ? reject(err) : resolve(result)
                );
            });
        }
        
        // Insertar productos de ejemplo
        const productos = [
            {
                nombre: 'Camiseta Básica Algodón',
                descripcion: 'Camiseta básica de algodón 100% orgánico, perfecta para el día a día. Suave al tacto y transpirable.',
                precio: 299.00,
                categoria_id: 1,
                tallas: '["XS", "S", "M", "L", "XL"]',
                colores: '["Blanco", "Negro", "Gris", "Azul Marino"]',
                material: 'Algodón 100%',
                genero: 'unisex',
                stock: 50,
                destacado: true
            },
            {
                nombre: 'Jean Skinny Premium',
                descripcion: 'Jean skinny de mezclilla premium con stretch, corte moderno y cómodo. Perfecto para cualquier ocasión.',
                precio: 899.00,
                categoria_id: 2,
                tallas: '["26", "28", "30", "32", "34", "36"]',
                colores: '["Azul Oscuro", "Negro", "Azul Claro"]',
                material: 'Mezclilla 98% Algodón, 2% Elastano',
                genero: 'mujer',
                stock: 30,
                destacado: true
            },
            {
                nombre: 'Vestido Casual Floral',
                descripcion: 'Vestido casual con estampado floral, ideal para primavera y verano. Diseño femenino y elegante.',
                precio: 699.00,
                categoria_id: 3,
                tallas: '["XS", "S", "M", "L", "XL"]',
                colores: '["Floral Rosa", "Floral Azul", "Floral Amarillo"]',
                material: 'Viscosa',
                genero: 'mujer',
                stock: 25,
                destacado: false
            },
            {
                nombre: 'Hoodie Premium',
                descripcion: 'Sudadera con capucha de algodón premium, diseño minimalista. Perfecta para días frescos.',
                precio: 799.00,
                categoria_id: 4,
                tallas: '["S", "M", "L", "XL", "XXL"]',
                colores: '["Negro", "Gris", "Blanco", "Azul Marino"]',
                material: 'Algodón 80%, Poliéster 20%',
                genero: 'unisex',
                stock: 40,
                destacado: true
            },
            {
                nombre: 'Tenis Deportivos',
                descripcion: 'Tenis deportivos con tecnología de amortiguación y diseño moderno. Ideales para correr o uso casual.',
                precio: 1299.00,
                categoria_id: 5,
                tallas: '["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"]',
                colores: '["Blanco", "Negro", "Azul", "Rosa"]',
                material: 'Sintético y Malla',
                genero: 'unisex',
                stock: 35,
                destacado: false
            },
            {
                nombre: 'Chaqueta de Cuero',
                descripcion: 'Chaqueta de cuero sintético con diseño moderno. Perfecta para un look elegante y urbano.',
                precio: 1599.00,
                categoria_id: 4,
                tallas: '["S", "M", "L", "XL"]',
                colores: '["Negro", "Marrón", "Gris"]',
                material: 'Cuero sintético',
                genero: 'unisex',
                stock: 20,
                destacado: true
            },
            {
                nombre: 'Falda Plisada',
                descripcion: 'Falda plisada de corte medio, perfecta para ocasiones formales o casuales elegantes.',
                precio: 549.00,
                categoria_id: 3,
                tallas: '["XS", "S", "M", "L"]',
                colores: '["Negro", "Azul Marino", "Gris", "Beige"]',
                material: 'Poliéster',
                genero: 'mujer',
                stock: 28,
                destacado: false
            },
            {
                nombre: 'Conjunto Deportivo',
                descripcion: 'Conjunto deportivo de dos piezas, ideal para ejercicio o uso casual. Tela transpirable y cómoda.',
                precio: 899.00,
                categoria_id: 8,
                tallas: '["XS", "S", "M", "L", "XL"]',
                colores: '["Negro", "Gris", "Azul", "Rosa"]',
                material: 'Poliéster 85%, Elastano 15%',
                genero: 'mujer',
                stock: 45,
                destacado: true
            }
        ];
        
        for (const producto of productos) {
            await new Promise((resolve, reject) => {
                db.query(
                    `INSERT IGNORE INTO productos 
                    (nombre, descripcion, precio, categoria_id, tallas, colores, material, genero, stock, destacado) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        producto.nombre,
                        producto.descripcion,
                        producto.precio,
                        producto.categoria_id,
                        producto.tallas,
                        producto.colores,
                        producto.material,
                        producto.genero,
                        producto.stock,
                        producto.destacado
                    ],
                    (err, result) => err ? reject(err) : resolve(result)
                );
            });
        }
        
        // Insertar usuario administrador
        await new Promise((resolve, reject) => {
            db.query(
                'INSERT IGNORE INTO usuarios (nombre, apellido, email, password_hash, es_admin) VALUES (?, ?, ?, ?, ?)',
                ['Admin', 'Sistema', 'admin@tienda.com', adminPassword, true],
                (err, result) => err ? reject(err) : resolve(result)
            );
        });
        
        // Insertar usuario de prueba
        const userPassword = await bcrypt.hash('usuario123', 10);
        await new Promise((resolve, reject) => {
            db.query(
                'INSERT IGNORE INTO usuarios (nombre, apellido, email, password_hash, telefono) VALUES (?, ?, ?, ?, ?)',
                ['Juan', 'Pérez', 'juan@ejemplo.com', userPassword, '555-1234'],
                (err, result) => err ? reject(err) : resolve(result)
            );
        });
        
        console.log('✅ Base de datos configurada exitosamente!');
        console.log('');
        console.log('👤 Usuarios de prueba creados:');
        console.log('   Administrador: admin@tienda.com (contraseña: admin123)');
        console.log('   Usuario: juan@ejemplo.com (contraseña: usuario123)');
        console.log('');
        console.log('🚀 Puedes acceder a la aplicación en: http://localhost:3000');
        
    } catch (error) {
        console.error('❌ Error configurando la base de datos:', error);
    } finally {
        db.end();
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase };
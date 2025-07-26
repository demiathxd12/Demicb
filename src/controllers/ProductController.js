const Product = require('../models/Product');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const { validatePagination, sanitizeInput } = require('../utils/validation');

class ProductController {
    // Mostrar página principal con productos destacados
    index = asyncHandler(async (req, res) => {
        try {
            const [productosDestacados, categorias] = await Promise.all([
                Product.findFeatured(8),
                Category.findAll({ activa: true })
            ]);

            res.render('index', {
                titulo: 'Tienda de Ropa Online',
                productosDestacados,
                categorias
            });
        } catch (error) {
            console.error('Error in ProductController.index:', error);
            res.render('index', {
                titulo: 'Tienda de Ropa Online',
                productosDestacados: [],
                categorias: [],
                error: 'Error cargando productos destacados'
            });
        }
    });

    // Mostrar catálogo de productos con filtros
    catalog = asyncHandler(async (req, res) => {
        try {
            // Sanitizar y validar parámetros
            const filters = {
                categoria: sanitizeInput(req.query.categoria),
                genero: sanitizeInput(req.query.genero),
                busqueda: sanitizeInput(req.query.q),
                orden: req.query.orden || 'fecha_desc'
            };

            const pagination = validatePagination(req.query);

            // Obtener productos y total
            const [productos, total, categorias] = await Promise.all([
                Product.findAllWithFilters(filters, pagination),
                Product.countWithFilters(filters),
                Category.findAll({ activa: true })
            ]);

            const totalPaginas = Math.ceil(total / pagination.limit);

            res.render('productos', {
                titulo: 'Catálogo de Productos',
                productos,
                categorias,
                filtros,
                paginacion: {
                    paginaActual: pagination.page,
                    totalPaginas,
                    total
                }
            });
        } catch (error) {
            console.error('Error in ProductController.catalog:', error);
            res.status(500).render('error', {
                titulo: 'Error',
                message: 'Error cargando catálogo de productos'
            });
        }
    });

    // Mostrar detalle de producto
    show = asyncHandler(async (req, res) => {
        try {
            const productId = parseInt(req.params.id);
            
            if (isNaN(productId)) {
                return res.status(404).render('404', {
                    titulo: 'Producto no encontrado'
                });
            }

            const [producto, resenas, productosSimilares] = await Promise.all([
                Product.findWithReviews(productId),
                this.getProductReviews(productId),
                this.getSimilarProducts(productId)
            ]);

            if (!producto) {
                return res.status(404).render('404', {
                    titulo: 'Producto no encontrado'
                });
            }

            res.render('producto-detalle', {
                titulo: producto.nombre,
                producto,
                resenas,
                productosSimilares,
                promedioCalificacion: producto.promedio_calificacion || '0.0'
            });
        } catch (error) {
            console.error('Error in ProductController.show:', error);
            res.status(500).render('error', {
                titulo: 'Error',
                message: 'Error cargando producto'
            });
        }
    });

    // Búsqueda de productos (API)
    search = asyncHandler(async (req, res) => {
        try {
            const query = sanitizeInput(req.query.q);
            const limit = Math.min(parseInt(req.query.limit) || 20, 50);

            if (!query || query.length < 2) {
                return res.json({
                    success: false,
                    message: 'La búsqueda debe tener al menos 2 caracteres'
                });
            }

            const productos = await Product.search(query, limit);

            res.json({
                success: true,
                productos,
                total: productos.length
            });
        } catch (error) {
            console.error('Error in ProductController.search:', error);
            res.json({
                success: false,
                message: 'Error en la búsqueda'
            });
        }
    });

    // Obtener productos por categoría (API)
    getByCategory = asyncHandler(async (req, res) => {
        try {
            const categoryId = parseInt(req.params.categoryId);
            const limit = Math.min(parseInt(req.query.limit) || 10, 20);

            if (isNaN(categoryId)) {
                return res.json({
                    success: false,
                    message: 'ID de categoría inválido'
                });
            }

            const productos = await Product.findByCategory(categoryId, limit);

            res.json({
                success: true,
                productos
            });
        } catch (error) {
            console.error('Error in ProductController.getByCategory:', error);
            res.json({
                success: false,
                message: 'Error obteniendo productos'
            });
        }
    });

    // Verificar stock de producto (API)
    checkStock = asyncHandler(async (req, res) => {
        try {
            const productId = parseInt(req.params.id);
            const cantidad = parseInt(req.body.cantidad) || 1;

            if (isNaN(productId) || cantidad <= 0) {
                return res.json({
                    success: false,
                    message: 'Datos inválidos'
                });
            }

            const stockAvailable = await Product.checkStock(productId, cantidad);

            res.json({
                success: true,
                stockAvailable,
                message: stockAvailable 
                    ? 'Stock disponible' 
                    : 'Stock insuficiente'
            });
        } catch (error) {
            console.error('Error in ProductController.checkStock:', error);
            res.json({
                success: false,
                message: 'Error verificando stock'
            });
        }
    });

    // Admin: Crear producto
    create = asyncHandler(async (req, res) => {
        try {
            const productData = {
                nombre: sanitizeInput(req.body.nombre),
                descripcion: sanitizeInput(req.body.descripcion),
                precio: parseFloat(req.body.precio),
                precio_oferta: req.body.precio_oferta ? parseFloat(req.body.precio_oferta) : null,
                categoria_id: parseInt(req.body.categoria_id),
                tallas: req.body.tallas || [],
                colores: req.body.colores || [],
                material: sanitizeInput(req.body.material),
                genero: req.body.genero,
                stock: parseInt(req.body.stock) || 0,
                destacado: req.body.destacado === 'true',
                activo: true
            };

            // Manejar imagen principal si se subió
            if (req.file) {
                productData.imagen_principal = `/uploads/${req.file.filename}`;
            }

            const producto = await Product.createWithValidation(productData);

            res.json({
                success: true,
                producto,
                message: 'Producto creado exitosamente'
            });
        } catch (error) {
            console.error('Error in ProductController.create:', error);
            res.json({
                success: false,
                message: error.message || 'Error creando producto'
            });
        }
    });

    // Admin: Actualizar producto
    update = asyncHandler(async (req, res) => {
        try {
            const productId = parseInt(req.params.id);
            
            if (isNaN(productId)) {
                return res.json({
                    success: false,
                    message: 'ID de producto inválido'
                });
            }

            const updateData = {};
            const allowedFields = [
                'nombre', 'descripcion', 'precio', 'precio_oferta',
                'categoria_id', 'material', 'genero', 'stock', 'destacado', 'activo'
            ];

            // Filtrar campos permitidos
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    updateData[field] = req.body[field];
                }
            }

            // Manejar arrays
            if (req.body.tallas) {
                updateData.tallas = JSON.stringify(req.body.tallas);
            }
            if (req.body.colores) {
                updateData.colores = JSON.stringify(req.body.colores);
            }

            // Manejar nueva imagen
            if (req.file) {
                updateData.imagen_principal = `/uploads/${req.file.filename}`;
            }

            const result = await Product.update(productId, updateData);

            res.json({
                success: true,
                result,
                message: 'Producto actualizado exitosamente'
            });
        } catch (error) {
            console.error('Error in ProductController.update:', error);
            res.json({
                success: false,
                message: error.message || 'Error actualizando producto'
            });
        }
    });

    // Admin: Eliminar producto (soft delete)
    delete = asyncHandler(async (req, res) => {
        try {
            const productId = parseInt(req.params.id);
            
            if (isNaN(productId)) {
                return res.json({
                    success: false,
                    message: 'ID de producto inválido'
                });
            }

            await Product.update(productId, { activo: false });

            res.json({
                success: true,
                message: 'Producto eliminado exitosamente'
            });
        } catch (error) {
            console.error('Error in ProductController.delete:', error);
            res.json({
                success: false,
                message: 'Error eliminando producto'
            });
        }
    });

    // Métodos auxiliares privados
    async getProductReviews(productId) {
        try {
            const sql = `
                SELECT r.*, u.nombre, u.apellido
                FROM resenas r
                JOIN usuarios u ON r.usuario_id = u.id
                WHERE r.producto_id = ?
                ORDER BY r.fecha_creacion DESC
                LIMIT 10
            `;
            return await Product.customQuery(sql, [productId]);
        } catch (error) {
            console.error('Error getting product reviews:', error);
            return [];
        }
    }

    async getSimilarProducts(productId) {
        try {
            const producto = await Product.findById(productId);
            if (!producto) return [];

            return await Product.findSimilar(productId, producto.categoria_id, 4);
        } catch (error) {
            console.error('Error getting similar products:', error);
            return [];
        }
    }
}

module.exports = new ProductController();
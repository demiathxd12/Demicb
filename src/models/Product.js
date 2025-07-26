const BaseModel = require('./BaseModel');

class Product extends BaseModel {
    constructor() {
        super('productos');
    }

    async findWithCategory(id) {
        try {
            const sql = `
                SELECT p.*, c.nombre as categoria_nombre
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.id = ? AND p.activo = TRUE
            `;
            const results = await this.db.query(sql, [id]);
            
            if (results.length > 0) {
                const producto = results[0];
                return this.parseJsonFields(producto);
            }
            return null;
        } catch (error) {
            console.error('Error in Product.findWithCategory:', error);
            throw error;
        }
    }

    async findAllWithFilters(filters = {}, pagination = {}) {
        try {
            const { categoria, genero, busqueda, orden = 'fecha_desc' } = filters;
            const { page = 1, limit = 12 } = pagination;
            const offset = (page - 1) * limit;

            let sql = `
                SELECT p.*, c.nombre as categoria_nombre
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.activo = TRUE
            `;
            const params = [];

            // Filtros
            if (categoria) {
                sql += ' AND c.nombre = ?';
                params.push(categoria);
            }

            if (genero) {
                sql += ' AND p.genero = ?';
                params.push(genero);
            }

            if (busqueda) {
                sql += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ?)';
                params.push(`%${busqueda}%`, `%${busqueda}%`);
            }

            // Ordenamiento
            switch (orden) {
                case 'precio_asc':
                    sql += ' ORDER BY p.precio ASC';
                    break;
                case 'precio_desc':
                    sql += ' ORDER BY p.precio DESC';
                    break;
                case 'nombre':
                    sql += ' ORDER BY p.nombre ASC';
                    break;
                case 'popularidad':
                    sql += ' ORDER BY p.destacado DESC, p.fecha_creacion DESC';
                    break;
                default:
                    sql += ' ORDER BY p.fecha_creacion DESC';
            }

            // Paginación
            sql += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const productos = await this.db.query(sql, params);
            
            // Parsear campos JSON
            return productos.map(producto => this.parseJsonFields(producto));
        } catch (error) {
            console.error('Error in Product.findAllWithFilters:', error);
            throw error;
        }
    }

    async countWithFilters(filters = {}) {
        try {
            const { categoria, genero, busqueda } = filters;

            let sql = `
                SELECT COUNT(*) as count
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.activo = TRUE
            `;
            const params = [];

            if (categoria) {
                sql += ' AND c.nombre = ?';
                params.push(categoria);
            }

            if (genero) {
                sql += ' AND p.genero = ?';
                params.push(genero);
            }

            if (busqueda) {
                sql += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ?)';
                params.push(`%${busqueda}%`, `%${busqueda}%`);
            }

            const results = await this.db.query(sql, params);
            return results[0].count;
        } catch (error) {
            console.error('Error in Product.countWithFilters:', error);
            throw error;
        }
    }

    async findFeatured(limit = 8) {
        try {
            const sql = `
                SELECT p.*, c.nombre as categoria_nombre
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.destacado = TRUE AND p.activo = TRUE
                ORDER BY p.fecha_creacion DESC
                LIMIT ?
            `;
            const productos = await this.db.query(sql, [limit]);
            return productos.map(producto => this.parseJsonFields(producto));
        } catch (error) {
            console.error('Error in Product.findFeatured:', error);
            throw error;
        }
    }

    async findByCategory(categoryId, limit = 10) {
        try {
            const sql = `
                SELECT p.*, c.nombre as categoria_nombre
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.categoria_id = ? AND p.activo = TRUE
                ORDER BY p.destacado DESC, p.fecha_creacion DESC
                LIMIT ?
            `;
            const productos = await this.db.query(sql, [categoryId, limit]);
            return productos.map(producto => this.parseJsonFields(producto));
        } catch (error) {
            console.error('Error in Product.findByCategory:', error);
            throw error;
        }
    }

    async findSimilar(productId, categoryId, limit = 4) {
        try {
            const sql = `
                SELECT p.*, c.nombre as categoria_nombre
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.categoria_id = ? AND p.id != ? AND p.activo = TRUE
                ORDER BY p.destacado DESC, RAND()
                LIMIT ?
            `;
            const productos = await this.db.query(sql, [categoryId, productId, limit]);
            return productos.map(producto => this.parseJsonFields(producto));
        } catch (error) {
            console.error('Error in Product.findSimilar:', error);
            throw error;
        }
    }

    async updateStock(productId, quantity) {
        try {
            const sql = 'UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?';
            const result = await this.db.query(sql, [quantity, productId, quantity]);
            
            if (result.affectedRows === 0) {
                throw new Error('Stock insuficiente');
            }
            
            return result;
        } catch (error) {
            console.error('Error in Product.updateStock:', error);
            throw error;
        }
    }

    async checkStock(productId, quantity) {
        try {
            const producto = await this.findById(productId);
            return producto && producto.stock >= quantity;
        } catch (error) {
            console.error('Error in Product.checkStock:', error);
            throw error;
        }
    }

    async search(query, limit = 20) {
        try {
            const sql = `
                SELECT p.*, c.nombre as categoria_nombre,
                       MATCH(p.nombre, p.descripcion) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.activo = TRUE AND (
                    MATCH(p.nombre, p.descripcion) AGAINST(? IN NATURAL LANGUAGE MODE)
                    OR p.nombre LIKE ?
                    OR p.descripcion LIKE ?
                )
                ORDER BY relevance DESC, p.destacado DESC
                LIMIT ?
            `;
            const searchTerm = `%${query}%`;
            const productos = await this.db.query(sql, [query, query, searchTerm, searchTerm, limit]);
            return productos.map(producto => this.parseJsonFields(producto));
        } catch (error) {
            // Si full-text search falla, usar búsqueda LIKE
            const sql = `
                SELECT p.*, c.nombre as categoria_nombre
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.activo = TRUE AND (p.nombre LIKE ? OR p.descripcion LIKE ?)
                ORDER BY p.destacado DESC, p.fecha_creacion DESC
                LIMIT ?
            `;
            const searchTerm = `%${query}%`;
            const productos = await this.db.query(sql, [searchTerm, searchTerm, limit]);
            return productos.map(producto => this.parseJsonFields(producto));
        }
    }

    async findWithReviews(productId) {
        try {
            const sql = `
                SELECT p.*, c.nombre as categoria_nombre,
                       COALESCE(AVG(r.calificacion), 0) as promedio_calificacion,
                       COUNT(r.id) as total_resenas
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                LEFT JOIN resenas r ON p.id = r.producto_id
                WHERE p.id = ? AND p.activo = TRUE
                GROUP BY p.id
            `;
            const results = await this.db.query(sql, [productId]);
            
            if (results.length > 0) {
                const producto = this.parseJsonFields(results[0]);
                producto.promedio_calificacion = parseFloat(producto.promedio_calificacion).toFixed(1);
                return producto;
            }
            return null;
        } catch (error) {
            console.error('Error in Product.findWithReviews:', error);
            throw error;
        }
    }

    parseJsonFields(producto) {
        try {
            if (producto.tallas) {
                producto.tallas = typeof producto.tallas === 'string' 
                    ? JSON.parse(producto.tallas) 
                    : producto.tallas;
            }
            if (producto.colores) {
                producto.colores = typeof producto.colores === 'string' 
                    ? JSON.parse(producto.colores) 
                    : producto.colores;
            }
            if (producto.imagenes_adicionales) {
                producto.imagenes_adicionales = typeof producto.imagenes_adicionales === 'string' 
                    ? JSON.parse(producto.imagenes_adicionales) 
                    : producto.imagenes_adicionales;
            }
            return producto;
        } catch (error) {
            console.error('Error parsing JSON fields:', error);
            // Devolver arrays vacíos si hay error en el parsing
            return {
                ...producto,
                tallas: [],
                colores: [],
                imagenes_adicionales: []
            };
        }
    }

    async validateProductData(data) {
        const errors = [];

        if (!data.nombre || data.nombre.trim().length < 3) {
            errors.push('El nombre del producto debe tener al menos 3 caracteres');
        }

        if (!data.precio || data.precio <= 0) {
            errors.push('El precio debe ser mayor a 0');
        }

        if (!data.categoria_id) {
            errors.push('La categoría es obligatoria');
        }

        if (data.stock && data.stock < 0) {
            errors.push('El stock no puede ser negativo');
        }

        return errors;
    }

    async createWithValidation(data) {
        const errors = await this.validateProductData(data);
        if (errors.length > 0) {
            throw new Error(`Errores de validación: ${errors.join(', ')}`);
        }

        // Convertir arrays a JSON strings
        if (data.tallas && Array.isArray(data.tallas)) {
            data.tallas = JSON.stringify(data.tallas);
        }
        if (data.colores && Array.isArray(data.colores)) {
            data.colores = JSON.stringify(data.colores);
        }
        if (data.imagenes_adicionales && Array.isArray(data.imagenes_adicionales)) {
            data.imagenes_adicionales = JSON.stringify(data.imagenes_adicionales);
        }

        return await this.create(data);
    }
}

module.exports = new Product();
const BaseModel = require('./BaseModel');

class Category extends BaseModel {
    constructor() {
        super('categorias');
    }

    async findActive() {
        try {
            return await this.findAll({ activa: true }, { orderBy: 'nombre ASC' });
        } catch (error) {
            console.error('Error in Category.findActive:', error);
            throw error;
        }
    }

    async findWithProductCount() {
        try {
            const sql = `
                SELECT c.*, COUNT(p.id) as total_productos
                FROM categorias c
                LEFT JOIN productos p ON c.id = p.categoria_id AND p.activo = TRUE
                WHERE c.activa = TRUE
                GROUP BY c.id
                ORDER BY c.nombre ASC
            `;
            return await this.customQuery(sql);
        } catch (error) {
            console.error('Error in Category.findWithProductCount:', error);
            throw error;
        }
    }

    async validateCategoryData(data) {
        const errors = [];

        if (!data.nombre || data.nombre.trim().length < 2) {
            errors.push('El nombre de la categoría debe tener al menos 2 caracteres');
        }

        if (data.nombre && data.nombre.length > 100) {
            errors.push('El nombre de la categoría no puede tener más de 100 caracteres');
        }

        // Verificar si ya existe una categoría con el mismo nombre
        if (data.nombre) {
            const existing = await this.findOne({ nombre: data.nombre.trim() });
            if (existing && existing.id !== data.id) {
                errors.push('Ya existe una categoría con ese nombre');
            }
        }

        return errors;
    }

    async createWithValidation(data) {
        const errors = await this.validateCategoryData(data);
        if (errors.length > 0) {
            throw new Error(`Errores de validación: ${errors.join(', ')}`);
        }

        return await this.create({
            nombre: data.nombre.trim(),
            descripcion: data.descripcion?.trim() || null,
            imagen: data.imagen || null,
            activa: true
        });
    }
}

module.exports = new Category();
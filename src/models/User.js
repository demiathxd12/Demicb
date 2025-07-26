const BaseModel = require('./BaseModel');
const bcrypt = require('bcrypt');

class User extends BaseModel {
    constructor() {
        super('usuarios');
    }

    async findByEmail(email) {
        try {
            const sql = 'SELECT * FROM usuarios WHERE email = ? AND activo = TRUE';
            const results = await this.db.query(sql, [email]);
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error('Error in User.findByEmail:', error);
            throw error;
        }
    }

    async createUser(userData) {
        try {
            const errors = await this.validateUserData(userData);
            if (errors.length > 0) {
                throw new Error(`Errores de validación: ${errors.join(', ')}`);
            }

            // Verificar si el email ya existe
            const existingUser = await this.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('El email ya está registrado');
            }

            // Encriptar contraseña
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(userData.password, saltRounds);

            // Preparar datos del usuario
            const userToCreate = {
                nombre: userData.nombre.trim(),
                apellido: userData.apellido.trim(),
                email: userData.email.toLowerCase().trim(),
                password_hash: passwordHash,
                telefono: userData.telefono || null,
                fecha_nacimiento: userData.fecha_nacimiento || null,
                genero: userData.genero || null,
                activo: true,
                es_admin: false,
                fecha_registro: new Date()
            };

            const result = await this.create(userToCreate);
            
            // Retornar usuario sin la contraseña
            const { password_hash, ...userWithoutPassword } = userToCreate;
            return { ...userWithoutPassword, id: result.id };
        } catch (error) {
            console.error('Error in User.createUser:', error);
            throw error;
        }
    }

    async authenticate(email, password) {
        try {
            const user = await this.findByEmail(email);
            if (!user) {
                return null;
            }

            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return null;
            }

            // Actualizar último acceso
            await this.updateLastAccess(user.id);

            // Retornar usuario sin la contraseña
            const { password_hash, ...userWithoutPassword } = user;
            return userWithoutPassword;
        } catch (error) {
            console.error('Error in User.authenticate:', error);
            throw error;
        }
    }

    async updateLastAccess(userId) {
        try {
            const sql = 'UPDATE usuarios SET fecha_ultimo_acceso = NOW() WHERE id = ?';
            await this.db.query(sql, [userId]);
        } catch (error) {
            console.error('Error in User.updateLastAccess:', error);
            throw error;
        }
    }

    async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await this.findById(userId);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            // Verificar contraseña actual
            const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Contraseña actual incorrecta');
            }

            // Validar nueva contraseña
            if (newPassword.length < 6) {
                throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
            }

            // Encriptar nueva contraseña
            const saltRounds = 12;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

            // Actualizar contraseña
            await this.update(userId, { password_hash: newPasswordHash });
            
            return { success: true };
        } catch (error) {
            console.error('Error in User.changePassword:', error);
            throw error;
        }
    }

    async updateProfile(userId, profileData) {
        try {
            const allowedFields = ['nombre', 'apellido', 'telefono', 'fecha_nacimiento', 'genero'];
            const updateData = {};

            // Filtrar solo campos permitidos
            for (const field of allowedFields) {
                if (profileData[field] !== undefined) {
                    updateData[field] = profileData[field];
                }
            }

            if (Object.keys(updateData).length === 0) {
                throw new Error('No hay datos válidos para actualizar');
            }

            // Validar datos
            if (updateData.nombre && updateData.nombre.trim().length < 2) {
                throw new Error('El nombre debe tener al menos 2 caracteres');
            }

            if (updateData.apellido && updateData.apellido.trim().length < 2) {
                throw new Error('El apellido debe tener al menos 2 caracteres');
            }

            if (updateData.telefono && !/^[\+]?[0-9\-\s()]+$/.test(updateData.telefono)) {
                throw new Error('Formato de teléfono inválido');
            }

            const result = await this.update(userId, updateData);
            return result;
        } catch (error) {
            console.error('Error in User.updateProfile:', error);
            throw error;
        }
    }

    async deactivateUser(userId) {
        try {
            await this.update(userId, { activo: false });
            return { success: true };
        } catch (error) {
            console.error('Error in User.deactivateUser:', error);
            throw error;
        }
    }

    async findWithAddresses(userId) {
        try {
            const sql = `
                SELECT u.*, 
                       JSON_ARRAYAGG(
                           IF(d.id IS NOT NULL, 
                               JSON_OBJECT(
                                   'id', d.id,
                                   'tipo', d.tipo,
                                   'nombre_completo', d.nombre_completo,
                                   'direccion', d.direccion,
                                   'ciudad', d.ciudad,
                                   'estado_provincia', d.estado_provincia,
                                   'codigo_postal', d.codigo_postal,
                                   'pais', d.pais,
                                   'telefono', d.telefono,
                                   'es_principal', d.es_principal
                               ), 
                               NULL
                           )
                       ) as direcciones
                FROM usuarios u
                LEFT JOIN direcciones d ON u.id = d.usuario_id
                WHERE u.id = ? AND u.activo = TRUE
                GROUP BY u.id
            `;
            
            const results = await this.db.query(sql, [userId]);
            if (results.length > 0) {
                const user = results[0];
                // Parsear direcciones JSON y filtrar nulls
                if (user.direcciones) {
                    user.direcciones = JSON.parse(user.direcciones).filter(d => d !== null);
                } else {
                    user.direcciones = [];
                }
                
                // Remover contraseña
                delete user.password_hash;
                return user;
            }
            return null;
        } catch (error) {
            console.error('Error in User.findWithAddresses:', error);
            throw error;
        }
    }

    async findRecentUsers(limit = 10) {
        try {
            const sql = `
                SELECT id, nombre, apellido, email, fecha_registro, fecha_ultimo_acceso
                FROM usuarios 
                WHERE activo = TRUE 
                ORDER BY fecha_registro DESC 
                LIMIT ?
            `;
            return await this.db.query(sql, [limit]);
        } catch (error) {
            console.error('Error in User.findRecentUsers:', error);
            throw error;
        }
    }

    async getStatistics() {
        try {
            const sql = `
                SELECT 
                    COUNT(*) as total_usuarios,
                    COUNT(CASE WHEN DATE(fecha_registro) = CURDATE() THEN 1 END) as registros_hoy,
                    COUNT(CASE WHEN fecha_ultimo_acceso >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as activos_semana,
                    COUNT(CASE WHEN es_admin = TRUE THEN 1 END) as total_admins
                FROM usuarios 
                WHERE activo = TRUE
            `;
            const results = await this.db.query(sql);
            return results[0];
        } catch (error) {
            console.error('Error in User.getStatistics:', error);
            throw error;
        }
    }

    validateUserData(userData) {
        const errors = [];

        // Validar nombre
        if (!userData.nombre || userData.nombre.trim().length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        }

        // Validar apellido
        if (!userData.apellido || userData.apellido.trim().length < 2) {
            errors.push('El apellido debe tener al menos 2 caracteres');
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!userData.email || !emailRegex.test(userData.email)) {
            errors.push('El email no tiene un formato válido');
        }

        // Validar contraseña
        if (!userData.password || userData.password.length < 6) {
            errors.push('La contraseña debe tener al menos 6 caracteres');
        }

        // Validar teléfono (opcional)
        if (userData.telefono && !/^[\+]?[0-9\-\s()]+$/.test(userData.telefono)) {
            errors.push('El formato del teléfono no es válido');
        }

        return errors;
    }

    async findAdmins() {
        try {
            const sql = `
                SELECT id, nombre, apellido, email, fecha_registro, fecha_ultimo_acceso
                FROM usuarios 
                WHERE es_admin = TRUE AND activo = TRUE 
                ORDER BY fecha_registro ASC
            `;
            return await this.db.query(sql);
        } catch (error) {
            console.error('Error in User.findAdmins:', error);
            throw error;
        }
    }

    async promoteToAdmin(userId) {
        try {
            const result = await this.update(userId, { es_admin: true });
            return result;
        } catch (error) {
            console.error('Error in User.promoteToAdmin:', error);
            throw error;
        }
    }

    async revokeAdmin(userId) {
        try {
            const result = await this.update(userId, { es_admin: false });
            return result;
        } catch (error) {
            console.error('Error in User.revokeAdmin:', error);
            throw error;
        }
    }
}

module.exports = new User();
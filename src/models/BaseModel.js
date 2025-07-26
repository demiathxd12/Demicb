const database = require('../config/database');

class BaseModel {
    constructor(tableName) {
        this.tableName = tableName;
        this.db = database;
    }

    async findAll(conditions = {}, options = {}) {
        try {
            let sql = `SELECT * FROM ${this.tableName}`;
            const params = [];

            // WHERE clause
            if (Object.keys(conditions).length > 0) {
                const whereClause = Object.keys(conditions)
                    .map(key => `${key} = ?`)
                    .join(' AND ');
                sql += ` WHERE ${whereClause}`;
                params.push(...Object.values(conditions));
            }

            // ORDER BY
            if (options.orderBy) {
                sql += ` ORDER BY ${options.orderBy}`;
            }

            // LIMIT and OFFSET
            if (options.limit) {
                sql += ` LIMIT ?`;
                params.push(options.limit);
                
                if (options.offset) {
                    sql += ` OFFSET ?`;
                    params.push(options.offset);
                }
            }

            const results = await this.db.query(sql, params);
            return results;
        } catch (error) {
            console.error(`Error in ${this.tableName}.findAll:`, error);
            throw error;
        }
    }

    async findById(id) {
        try {
            const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
            const results = await this.db.query(sql, [id]);
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error(`Error in ${this.tableName}.findById:`, error);
            throw error;
        }
    }

    async findOne(conditions = {}) {
        try {
            const results = await this.findAll(conditions, { limit: 1 });
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error(`Error in ${this.tableName}.findOne:`, error);
            throw error;
        }
    }

    async create(data) {
        try {
            const fields = Object.keys(data);
            const values = Object.values(data);
            const placeholders = fields.map(() => '?').join(', ');
            
            const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
            const result = await this.db.query(sql, values);
            
            return {
                id: result.insertId,
                affectedRows: result.affectedRows,
                ...data
            };
        } catch (error) {
            console.error(`Error in ${this.tableName}.create:`, error);
            throw error;
        }
    }

    async update(id, data) {
        try {
            const fields = Object.keys(data);
            const values = Object.values(data);
            const setClause = fields.map(field => `${field} = ?`).join(', ');
            
            const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
            const result = await this.db.query(sql, [...values, id]);
            
            return {
                id,
                affectedRows: result.affectedRows,
                changedRows: result.changedRows
            };
        } catch (error) {
            console.error(`Error in ${this.tableName}.update:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
            const result = await this.db.query(sql, [id]);
            
            return {
                affectedRows: result.affectedRows
            };
        } catch (error) {
            console.error(`Error in ${this.tableName}.delete:`, error);
            throw error;
        }
    }

    async count(conditions = {}) {
        try {
            let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
            const params = [];

            if (Object.keys(conditions).length > 0) {
                const whereClause = Object.keys(conditions)
                    .map(key => `${key} = ?`)
                    .join(' AND ');
                sql += ` WHERE ${whereClause}`;
                params.push(...Object.values(conditions));
            }

            const results = await this.db.query(sql, params);
            return results[0].count;
        } catch (error) {
            console.error(`Error in ${this.tableName}.count:`, error);
            throw error;
        }
    }

    async exists(conditions) {
        try {
            const count = await this.count(conditions);
            return count > 0;
        } catch (error) {
            console.error(`Error in ${this.tableName}.exists:`, error);
            throw error;
        }
    }

    // Método para ejecutar consultas personalizadas
    async customQuery(sql, params = []) {
        try {
            return await this.db.query(sql, params);
        } catch (error) {
            console.error(`Error in ${this.tableName}.customQuery:`, error);
            throw error;
        }
    }

    // Método para transacciones
    async transaction(callback) {
        try {
            return await this.db.transaction(callback);
        } catch (error) {
            console.error(`Error in ${this.tableName}.transaction:`, error);
            throw error;
        }
    }
}

module.exports = BaseModel;
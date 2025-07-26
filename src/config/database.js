const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
    constructor() {
        this.pool = null;
        this.initializePool();
    }

    initializePool() {
        try {
            this.pool = mysql.createPool({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'tienda_ropa',
                charset: 'utf8mb4',
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                acquireTimeout: 60000,
                timeout: 60000,
                reconnect: true
            });

            console.log('✅ Database pool initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing database pool:', error);
            throw error;
        }
    }

    async getConnection() {
        try {
            return await this.pool.getConnection();
        } catch (error) {
            console.error('❌ Error getting database connection:', error);
            throw error;
        }
    }

    async query(sql, params = []) {
        const connection = await this.getConnection();
        try {
            const [rows] = await connection.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('❌ Database query error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    async transaction(callback) {
        const connection = await this.getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async testConnection() {
        try {
            const connection = await this.getConnection();
            await connection.ping();
            connection.release();
            console.log('✅ Database connection test successful');
            return true;
        } catch (error) {
            console.error('❌ Database connection test failed:', error);
            return false;
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 Database pool closed');
        }
    }
}

// Singleton instance
const database = new Database();

module.exports = database;
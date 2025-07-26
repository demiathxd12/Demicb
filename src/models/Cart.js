const BaseModel = require('./BaseModel');

class Cart extends BaseModel {
    constructor() {
        super('carritos');
    }

    async findOrCreateCart(userId, sessionId) {
        try {
            let cart;
            
            if (userId) {
                // Buscar carrito por usuario
                cart = await this.findOne({ usuario_id: userId });
                
                // Si hay un carrito de sesión, fusionarlo
                if (sessionId) {
                    const sessionCart = await this.findOne({ session_id: sessionId });
                    if (sessionCart && sessionCart.id !== cart?.id) {
                        await this.mergeCartItems(cart?.id, sessionCart.id);
                        await this.delete(sessionCart.id);
                    }
                }
            } else if (sessionId) {
                // Buscar carrito por sesión
                cart = await this.findOne({ session_id: sessionId });
            }

            // Crear nuevo carrito si no existe
            if (!cart) {
                cart = await this.create({
                    usuario_id: userId || null,
                    session_id: sessionId || null,
                    fecha_creacion: new Date(),
                    fecha_actualizacion: new Date()
                });
            }

            return cart;
        } catch (error) {
            console.error('Error in Cart.findOrCreateCart:', error);
            throw error;
        }
    }

    async getCartWithItems(userId, sessionId) {
        try {
            const cart = await this.findOrCreateCart(userId, sessionId);
            
            const sql = `
                SELECT ci.*, p.nombre, p.imagen_principal, p.precio, p.stock,
                       (ci.cantidad * ci.precio_unitario) as subtotal
                FROM carrito_items ci
                JOIN productos p ON ci.producto_id = p.id
                WHERE ci.carrito_id = ? AND p.activo = TRUE
                ORDER BY ci.fecha_agregado DESC
            `;
            
            const items = await this.db.query(sql, [cart.id]);
            
            const total = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
            const totalItems = items.reduce((sum, item) => sum + item.cantidad, 0);
            
            return {
                cart,
                items,
                total,
                totalItems
            };
        } catch (error) {
            console.error('Error in Cart.getCartWithItems:', error);
            throw error;
        }
    }

    async addItem(cartId, productId, cantidad, talla = null, color = null) {
        try {
            // Verificar stock del producto
            const producto = await this.db.query(
                'SELECT precio, stock FROM productos WHERE id = ? AND activo = TRUE',
                [productId]
            );
            
            if (producto.length === 0) {
                throw new Error('Producto no encontrado');
            }

            if (producto[0].stock < cantidad) {
                throw new Error('Stock insuficiente');
            }

            // Verificar si ya existe el item con las mismas características
            const existingItem = await this.db.query(
                `SELECT id, cantidad FROM carrito_items 
                 WHERE carrito_id = ? AND producto_id = ? AND 
                       COALESCE(talla, '') = ? AND COALESCE(color, '') = ?`,
                [cartId, productId, talla || '', color || '']
            );

            if (existingItem.length > 0) {
                // Actualizar cantidad
                const newQuantity = existingItem[0].cantidad + cantidad;
                
                if (producto[0].stock < newQuantity) {
                    throw new Error('Stock insuficiente para la cantidad solicitada');
                }

                await this.db.query(
                    'UPDATE carrito_items SET cantidad = ?, fecha_agregado = NOW() WHERE id = ?',
                    [newQuantity, existingItem[0].id]
                );
                
                return { id: existingItem[0].id, cantidad: newQuantity, updated: true };
            } else {
                // Insertar nuevo item
                const result = await this.db.query(
                    `INSERT INTO carrito_items 
                     (carrito_id, producto_id, cantidad, talla, color, precio_unitario, fecha_agregado)
                     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                    [cartId, productId, cantidad, talla, color, producto[0].precio]
                );
                
                // Actualizar fecha del carrito
                await this.update(cartId, { fecha_actualizacion: new Date() });
                
                return { id: result.insertId, cantidad, created: true };
            }
        } catch (error) {
            console.error('Error in Cart.addItem:', error);
            throw error;
        }
    }

    async updateItemQuantity(itemId, cantidad) {
        try {
            if (cantidad <= 0) {
                return await this.removeItem(itemId);
            }

            // Verificar stock disponible
            const itemInfo = await this.db.query(
                `SELECT ci.carrito_id, ci.producto_id, p.stock
                 FROM carrito_items ci
                 JOIN productos p ON ci.producto_id = p.id
                 WHERE ci.id = ?`,
                [itemId]
            );

            if (itemInfo.length === 0) {
                throw new Error('Item del carrito no encontrado');
            }

            if (itemInfo[0].stock < cantidad) {
                throw new Error('Stock insuficiente');
            }

            // Actualizar cantidad
            await this.db.query(
                'UPDATE carrito_items SET cantidad = ? WHERE id = ?',
                [cantidad, itemId]
            );

            // Actualizar fecha del carrito
            await this.update(itemInfo[0].carrito_id, { fecha_actualizacion: new Date() });

            return { success: true, cantidad };
        } catch (error) {
            console.error('Error in Cart.updateItemQuantity:', error);
            throw error;
        }
    }

    async removeItem(itemId) {
        try {
            // Obtener carrito_id antes de eliminar
            const itemInfo = await this.db.query(
                'SELECT carrito_id FROM carrito_items WHERE id = ?',
                [itemId]
            );

            if (itemInfo.length === 0) {
                throw new Error('Item del carrito no encontrado');
            }

            // Eliminar item
            await this.db.query('DELETE FROM carrito_items WHERE id = ?', [itemId]);

            // Actualizar fecha del carrito
            await this.update(itemInfo[0].carrito_id, { fecha_actualizacion: new Date() });

            return { success: true };
        } catch (error) {
            console.error('Error in Cart.removeItem:', error);
            throw error;
        }
    }

    async clearCart(cartId) {
        try {
            await this.db.query('DELETE FROM carrito_items WHERE carrito_id = ?', [cartId]);
            await this.update(cartId, { fecha_actualizacion: new Date() });
            return { success: true };
        } catch (error) {
            console.error('Error in Cart.clearCart:', error);
            throw error;
        }
    }

    async mergeCartItems(targetCartId, sourceCartId) {
        try {
            if (!targetCartId || !sourceCartId) return;

            // Obtener items del carrito origen
            const sourceItems = await this.db.query(
                'SELECT * FROM carrito_items WHERE carrito_id = ?',
                [sourceCartId]
            );

            // Fusionar cada item
            for (const item of sourceItems) {
                await this.addItem(
                    targetCartId,
                    item.producto_id,
                    item.cantidad,
                    item.talla,
                    item.color
                );
            }

            return { success: true };
        } catch (error) {
            console.error('Error in Cart.mergeCartItems:', error);
            throw error;
        }
    }

    async validateCartItems(cartId) {
        try {
            const sql = `
                SELECT ci.id, ci.cantidad, p.stock, p.nombre, p.activo
                FROM carrito_items ci
                JOIN productos p ON ci.producto_id = p.id
                WHERE ci.carrito_id = ?
            `;
            
            const items = await this.db.query(sql, [cartId]);
            const issues = [];

            for (const item of items) {
                if (!item.activo) {
                    issues.push({
                        itemId: item.id,
                        type: 'inactive',
                        message: `El producto "${item.nombre}" ya no está disponible`
                    });
                } else if (item.stock < item.cantidad) {
                    issues.push({
                        itemId: item.id,
                        type: 'stock',
                        message: `Stock insuficiente para "${item.nombre}". Disponible: ${item.stock}`,
                        availableStock: item.stock
                    });
                }
            }

            return issues;
        } catch (error) {
            console.error('Error in Cart.validateCartItems:', error);
            throw error;
        }
    }

    async getCartSummary(cartId) {
        try {
            const sql = `
                SELECT 
                    COUNT(ci.id) as total_items,
                    SUM(ci.cantidad) as total_quantity,
                    SUM(ci.cantidad * ci.precio_unitario) as subtotal
                FROM carrito_items ci
                JOIN productos p ON ci.producto_id = p.id
                WHERE ci.carrito_id = ? AND p.activo = TRUE
            `;
            
            const results = await this.db.query(sql, [cartId]);
            const summary = results[0];
            
            // Calcular envío
            const envio = summary.subtotal >= 1000 ? 0 : 100;
            const total = parseFloat(summary.subtotal || 0) + envio;
            
            return {
                totalItems: summary.total_items || 0,
                totalQuantity: summary.total_quantity || 0,
                subtotal: parseFloat(summary.subtotal || 0),
                envio: envio,
                total: total
            };
        } catch (error) {
            console.error('Error in Cart.getCartSummary:', error);
            throw error;
        }
    }

    async getAbandonedCarts(days = 7) {
        try {
            const sql = `
                SELECT c.*, COUNT(ci.id) as total_items
                FROM carritos c
                LEFT JOIN carrito_items ci ON c.id = ci.carrito_id
                WHERE c.fecha_actualizacion < DATE_SUB(NOW(), INTERVAL ? DAY)
                AND EXISTS (SELECT 1 FROM carrito_items WHERE carrito_id = c.id)
                GROUP BY c.id
                ORDER BY c.fecha_actualizacion DESC
            `;
            
            return await this.db.query(sql, [days]);
        } catch (error) {
            console.error('Error in Cart.getAbandonedCarts:', error);
            throw error;
        }
    }

    async cleanupExpiredCarts(days = 30) {
        try {
            // Eliminar carritos sin items más antiguos que X días
            const deleteEmptyCartsQuery = `
                DELETE FROM carritos 
                WHERE fecha_actualizacion < DATE_SUB(NOW(), INTERVAL ? DAY)
                AND NOT EXISTS (SELECT 1 FROM carrito_items WHERE carrito_id = carritos.id)
            `;
            
            const result = await this.db.query(deleteEmptyCartsQuery, [days]);
            
            return {
                deletedCarts: result.affectedRows
            };
        } catch (error) {
            console.error('Error in Cart.cleanupExpiredCarts:', error);
            throw error;
        }
    }
}

module.exports = new Cart();
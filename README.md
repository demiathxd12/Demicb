# 🛍️ Tienda de Ropa Online

Una tienda online moderna y completa para venta de ropa, desarrollada con Node.js, Express, MySQL y EJS.

## ✨ Características

- **Catálogo de productos** con filtros avanzados y búsqueda
- **Sistema de carrito** con gestión de sesiones
- **Autenticación de usuarios** con registro y login
- **Proceso de checkout** completo
- **Panel de administración** para gestión de productos
- **Diseño responsive** adaptado a todos los dispositivos
- **Seguridad avanzada** con bcrypt, helmet y rate limiting
- **Base de datos MySQL** con esquema completo

## 🏗️ Estructura del Proyecto

```
mi-tienda-online/
├── server.js                 # Servidor principal Express
├── package.json              # Dependencias y scripts
├── .env                      # Variables de entorno
├── .gitignore               # Archivos a ignorar por Git
├── schema.sql               # Schema de la base de datos
├── public/                  # Archivos estáticos
│   ├── css/
│   │   └── styles.css       # Estilos principales
│   ├── js/
│   │   └── main.js          # JavaScript del frontend
│   ├── images/              # Imágenes del sitio
│   └── uploads/             # Imágenes subidas
├── views/                   # Plantillas EJS
│   ├── layout.ejs          # Layout principal
│   ├── index.ejs           # Página de inicio
│   ├── productos.ejs       # Catálogo de productos
│   ├── carrito.ejs         # Carrito de compras
│   ├── login.ejs           # Página de login
│   ├── registro.ejs        # Página de registro
│   ├── exito.ejs           # Página de compra exitosa
│   └── cancelado.ejs       # Página de compra cancelada
```

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js (v14 o superior)
- MySQL (v5.7 o superior)
- npm o yarn

### Pasos de Instalación

1. **Clonar o descargar el proyecto**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd mi-tienda-online
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar la base de datos**
   - Crear una base de datos MySQL llamada `tienda_ropa`
   - Ejecutar el archivo `schema.sql` para crear las tablas:
   ```bash
   mysql -u root -p tienda_ropa < schema.sql
   ```

4. **Configurar variables de entorno**
   - Editar el archivo `.env` con tus credenciales:
   ```env
   DB_HOST=localhost
   DB_USER=tu_usuario_mysql
   DB_PASSWORD=tu_contraseña_mysql
   DB_NAME=tienda_ropa
   
   PORT=3000
   SESSION_SECRET=tu_secreto_super_seguro
   
   # Configuración de Stripe (opcional)
   STRIPE_PUBLIC_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```

5. **Iniciar el servidor**
   ```bash
   # Desarrollo
   npm run dev
   
   # Producción
   npm start
   ```

6. **Acceder a la aplicación**
   - Abre tu navegador en `http://localhost:3000`

## 🔧 Scripts Disponibles

- `npm start` - Inicia el servidor en modo producción
- `npm run dev` - Inicia el servidor en modo desarrollo con nodemon
- `npm test` - Ejecuta las pruebas (por implementar)

## 📊 Base de Datos

La aplicación utiliza MySQL con las siguientes tablas principales:

- **usuarios** - Información de usuarios registrados
- **productos** - Catálogo de productos
- **categorias** - Categorías de productos
- **carritos** - Carritos de compras
- **carrito_items** - Items dentro de cada carrito
- **pedidos** - Pedidos realizados
- **pedido_items** - Items de cada pedido
- **resenas** - Reseñas de productos

## 🎨 Funcionalidades

### Para Usuarios
- Navegación por categorías de productos
- Búsqueda y filtros avanzados
- Carrito de compras persistente
- Registro y autenticación de usuarios
- Proceso de checkout completo
- Historial de pedidos

### Para Administradores
- Gestión de productos y categorías
- Control de inventario
- Gestión de pedidos
- Panel de administración

## 🔒 Seguridad

- Encriptación de contraseñas con bcrypt
- Protección CSRF y XSS con helmet
- Rate limiting para prevenir ataques
- Validación de datos en frontend y backend
- Sesiones seguras con express-session

## 🎯 Características Técnicas

- **Frontend**: EJS, CSS3, JavaScript ES6+
- **Backend**: Node.js, Express.js
- **Base de datos**: MySQL
- **Autenticación**: bcrypt, express-session
- **Seguridad**: helmet, cors, rate limiting
- **Subida de archivos**: multer
- **Diseño**: CSS Grid, Flexbox, responsive design

## 🌟 Próximas Características

- [ ] Integración completa con Stripe
- [ ] Sistema de reseñas y calificaciones
- [ ] Wishlist de productos
- [ ] Sistema de cupones de descuento
- [ ] Panel de administración completo
- [ ] API REST para móvil
- [ ] Notificaciones push
- [ ] Chat de soporte en vivo

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo LICENSE para más detalles.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, lee las guías de contribución antes de enviar un pull request.

## 📞 Soporte

Si tienes preguntas o necesitas ayuda:
- Email: soporte@mitienda.com
- Teléfono: 555-123-4567

---

Desarrollado con ❤️ para la comunidad

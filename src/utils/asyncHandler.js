/**
 * Wrapper para manejar errores en funciones async/await
 * Evita tener que escribir try/catch en cada controlador
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = asyncHandler;
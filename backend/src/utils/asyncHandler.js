/**
 * Wraps an async Express handler so any thrown error / rejected promise
 * is forwarded to next(), instead of requiring a try/catch in every
 * controller. Keeps controllers flat and readable.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

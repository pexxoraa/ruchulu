const ApiError = require("../utils/ApiError");

/**
 * validate({ body, query, params }) — each key is an optional Zod schema.
 * On success, the parsed (and coerced/defaulted) value replaces req[key].
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      if (err.name === "ZodError") {
        const details = err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return next(ApiError.badRequest("Validation failed", details));
      }
      next(err);
    }
  };
}

module.exports = validate;

const ApiError = require("../src/utils/ApiError");

describe("ApiError", () => {
  it("sets statusCode, message, and isOperational=true by default", () => {
    const err = new ApiError(400, "Bad input");
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Bad input");
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });

  it("static helpers return the correct status codes", () => {
    expect(ApiError.badRequest().statusCode).toBe(400);
    expect(ApiError.unauthorized().statusCode).toBe(401);
    expect(ApiError.forbidden().statusCode).toBe(403);
    expect(ApiError.notFound().statusCode).toBe(404);
    expect(ApiError.conflict().statusCode).toBe(409);
    expect(ApiError.unprocessable().statusCode).toBe(422);
    expect(ApiError.tooManyRequests().statusCode).toBe(429);
  });

  it("internal() marks the error as non-operational", () => {
    const err = ApiError.internal();
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(false);
  });

  it("carries optional details for validation-style errors", () => {
    const details = [{ field: "email", message: "Invalid email" }];
    const err = ApiError.badRequest("Validation failed", details);
    expect(err.details).toEqual(details);
  });
});

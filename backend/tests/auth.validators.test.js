const {
  registerSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../src/modules/auth/auth.validators");

describe("auth.validators.registerSchema", () => {
  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      fullName: "Ramya K",
      email: "ramya@example.com",
      phone: "9876543210",
      password: "StrongPass1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a weak password (no uppercase)", () => {
    const result = registerSchema.safeParse({
      fullName: "Ramya K",
      email: "ramya@example.com",
      password: "weakpass1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password without a number", () => {
    const result = registerSchema.safeParse({
      fullName: "Ramya K",
      email: "ramya@example.com",
      password: "NoNumbersHere",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      fullName: "Ramya K",
      email: "not-an-email",
      password: "StrongPass1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a phone number that isn't a valid Indian mobile number", () => {
    const result = registerSchema.safeParse({
      fullName: "Ramya K",
      email: "ramya@example.com",
      phone: "12345",
      password: "StrongPass1",
    });
    expect(result.success).toBe(false);
  });

  it("requires phone — needed for OTP login and order updates", () => {
    const result = registerSchema.safeParse({
      fullName: "Ramya K",
      email: "ramya@example.com",
      password: "StrongPass1",
    });
    expect(result.success).toBe(false);
  });
});

describe("auth.validators.loginSchema", () => {
  it("requires both email and password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
    expect(loginSchema.safeParse({ password: "x" }).success).toBe(false);
  });

  it("accepts a valid login payload", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "anything" }).success).toBe(true);
  });
});

describe("auth.validators.requestOtpSchema", () => {
  it("defaults purpose to LOGIN", () => {
    const result = requestOtpSchema.parse({ phone: "9876543210" });
    expect(result.purpose).toBe("LOGIN");
  });

  it("rejects a phone starting with an invalid digit", () => {
    expect(requestOtpSchema.safeParse({ phone: "1234567890" }).success).toBe(false);
  });
});

describe("auth.validators.verifyOtpSchema", () => {
  it("requires a 6-digit otp", () => {
    expect(verifyOtpSchema.safeParse({ phone: "9876543210", otp: "12345" }).success).toBe(false);
    expect(verifyOtpSchema.safeParse({ phone: "9876543210", otp: "123456" }).success).toBe(true);
  });
});

describe("auth.validators.forgotPasswordSchema", () => {
  it("requires a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });
});

describe("auth.validators.resetPasswordSchema", () => {
  it("requires a token and a strong new password", () => {
    expect(resetPasswordSchema.safeParse({ token: "short", newPassword: "StrongPass1" }).success).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ token: "a".repeat(20), newPassword: "weak" }).success
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ token: "a".repeat(20), newPassword: "StrongPass1" }).success
    ).toBe(true);
  });
});

const {
  slugify,
  generateOrderNumber,
  generateSku,
  generateOtp,
  parsePagination,
  buildMeta,
} = require("../src/utils/helpers");

describe("helpers.slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Avakaya Mango Pickle")).toBe("avakaya-mango-pickle");
  });

  it("strips special characters", () => {
    expect(slugify("Gongura Pickle! (500g)")).toBe("gongura-pickle-500g");
  });

  it("collapses repeated whitespace/hyphens", () => {
    expect(slugify("  Extra   Spicy -- Pickle  ")).toBe("extra-spicy-pickle");
  });
});

describe("helpers.generateOrderNumber", () => {
  it("has the RCH- prefix and today's date", () => {
    const orderNumber = generateOrderNumber();
    expect(orderNumber).toMatch(/^RCH-\d{8}-[A-F0-9]{6}$/);
  });

  it("generates unique values across calls", () => {
    const a = generateOrderNumber();
    const b = generateOrderNumber();
    expect(a).not.toBe(b);
  });
});

describe("helpers.generateSku", () => {
  it("uses the given prefix", () => {
    expect(generateSku("PROD")).toMatch(/^PROD-[A-F0-9]{8}$/);
  });
});

describe("helpers.generateOtp", () => {
  it("generates a 6-digit numeric string by default", () => {
    const otp = generateOtp();
    expect(otp).toHaveLength(6);
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("respects a custom length", () => {
    expect(generateOtp(4)).toHaveLength(4);
  });
});

describe("helpers.parsePagination", () => {
  it("defaults to page 1, limit 20", () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it("computes skip correctly", () => {
    expect(parsePagination({ page: "3", limit: "10" })).toEqual({ page: 3, limit: 10, skip: 20 });
  });

  it("clamps limit to a maximum of 100", () => {
    expect(parsePagination({ limit: "500" }).limit).toBe(100);
  });

  it("never returns a page below 1", () => {
    expect(parsePagination({ page: "-5" }).page).toBe(1);
  });
});

describe("helpers.buildMeta", () => {
  it("computes total pages and hasNext/hasPrev correctly", () => {
    const meta = buildMeta({ page: 2, limit: 10, total: 25 });
    expect(meta).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    });
  });

  it("hasPrevPage is false on page 1", () => {
    expect(buildMeta({ page: 1, limit: 10, total: 25 }).hasPrevPage).toBe(false);
  });

  it("hasNextPage is false on the last page", () => {
    expect(buildMeta({ page: 3, limit: 10, total: 25 }).hasNextPage).toBe(false);
  });
});

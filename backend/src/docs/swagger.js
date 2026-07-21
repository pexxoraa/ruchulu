const swaggerJsdoc = require("swagger-jsdoc");
const env = require("../config/env");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Ruchulu API",
      version: "1.0.0",
      description:
        "REST API for Ruchulu — an authentic Andhra & Telangana pickles, snacks and podi e-commerce platform. " +
        "Powers the web, Android, and iOS clients from a single backend.",
      contact: { name: "Ruchulu Engineering" },
    },
    servers: [{ url: `${env.APP_URL}${env.API_PREFIX}`, description: env.NODE_ENV }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    tags: [
      { name: "Auth" },
      { name: "Users" },
      { name: "Products" },
      { name: "Categories" },
      { name: "Cart" },
      { name: "Wishlist" },
      { name: "Orders" },
      { name: "Coupons" },
      { name: "Reviews" },
      { name: "Inventory" },
      { name: "Admin" },
      { name: "Uploads" },
      { name: "Newsletter" },
      { name: "Contact" },
    ],
  },
  apis: ["./src/modules/**/*.routes.js"],
};

module.exports = swaggerJsdoc(options);

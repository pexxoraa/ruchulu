const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // --- Default warehouse ---
  const warehouse = await prisma.warehouse.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ruchulu Main Warehouse",
      city: "Vijayawada",
      state: "Andhra Pradesh",
      pincode: "520001",
    },
  });

  // --- Default super admin ---
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@ruchulu.com";
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      fullName: "Ruchulu Admin",
      email: adminEmail,
      passwordHash,
      role: "SUPER_ADMIN",
      isEmailVerified: true,
    },
  });
  console.log(`👤 Admin user ready: ${adminEmail} / (password from DEFAULT_ADMIN_PASSWORD)`);

  // --- Categories (must match the frontend's category filters exactly) ---
  const pickles = await prisma.category.upsert({
    where: { slug: "pickles" },
    update: {},
    create: { name: "Pickles", slug: "pickles", sortOrder: 1 },
  });
  const snacks = await prisma.category.upsert({
    where: { slug: "snacks" },
    update: {},
    create: { name: "Snacks", slug: "snacks", sortOrder: 2 },
  });
  const podis = await prisma.category.upsert({
    where: { slug: "podis" },
    update: {},
    create: { name: "Podis", slug: "podis", sortOrder: 3 },
  });
  const hampers = await prisma.category.upsert({
    where: { slug: "hampers" },
    update: {},
    create: { name: "Gift Hampers", slug: "hampers", sortOrder: 4 },
  });

  // --- The real Ruchulu product line, matching frontend/images/*.jpg exactly ---
  const sampleProducts = [
    {
      name: "Avakaya Mango Pickle",
      slug: "avakaya-mango-pickle",
      sku: "RCH-AVK-001",
      categoryId: pickles.id,
      type: "VEG",
      shortDescription: "Raw mangoes cut by hand and pickled in mustard, fenugreek and red chilli.",
      basePrice: 329,
      offerPrice: 329,
      spiceLevel: "HIGH",
      status: "ACTIVE",
      isFeatured: true,
      isBestSeller: true,
      image: "/images/avakaya.jpg",
      variants: [
        { label: "250g", price: 189, weightGrams: 250, stock: 50 },
        { label: "500g", price: 329, weightGrams: 500, stock: 40, isDefault: true },
        { label: "1kg", price: 599, weightGrams: 1000, stock: 20 },
      ],
    },
    {
      name: "Gongura Pickle",
      slug: "gongura-pickle",
      sku: "RCH-GNG-001",
      categoryId: pickles.id,
      type: "VEG",
      shortDescription: "Sorrel leaves pounded with garlic and red chilli into a tart, savoury pickle.",
      basePrice: 229,
      offerPrice: 229,
      spiceLevel: "MEDIUM",
      status: "ACTIVE",
      isFeatured: true,
      image: "/images/gongura.jpg",
      variants: [
        { label: "250g", price: 229, weightGrams: 250, stock: 45, isDefault: true },
        { label: "500g", price: 409, weightGrams: 500, stock: 25 },
      ],
    },
    {
      name: "Tomato Pickle",
      slug: "tomato-pickle",
      sku: "RCH-TOM-001",
      categoryId: pickles.id,
      type: "VEG",
      shortDescription: "Ripe tomatoes slow-cooked with red chilli and mustard into a tangy pickle.",
      basePrice: 219,
      spiceLevel: "MEDIUM",
      status: "ACTIVE",
      image: "/images/tomato.jpg",
      variants: [
        { label: "250g", price: 219, weightGrams: 250, stock: 40, isDefault: true },
        { label: "500g", price: 389, weightGrams: 500, stock: 20 },
      ],
    },
    {
      name: "Lemon Pickle",
      slug: "lemon-pickle",
      sku: "RCH-LEM-001",
      categoryId: pickles.id,
      type: "VEG",
      shortDescription: "Whole lemons pickled spicy, tangy and traditional.",
      basePrice: 199,
      spiceLevel: "HIGH",
      status: "ACTIVE",
      image: "/images/lemon.jpg",
      variants: [
        { label: "250g", price: 199, weightGrams: 250, stock: 40, isDefault: true },
        { label: "500g", price: 349, weightGrams: 500, stock: 20 },
      ],
    },
    {
      name: "Garlic Pickle",
      slug: "garlic-pickle",
      sku: "RCH-GAR-001",
      categoryId: pickles.id,
      type: "VEG",
      shortDescription: "Whole garlic cloves pickled in a fiery red chilli base.",
      basePrice: 249,
      spiceLevel: "HIGH",
      status: "ACTIVE",
      image: "/images/garlic.jpg",
      variants: [{ label: "400g", price: 249, weightGrams: 400, stock: 35, isDefault: true }],
    },
    {
      name: "Chicken Pickle",
      slug: "chicken-pickle",
      sku: "RCH-CHK-001",
      categoryId: pickles.id,
      type: "NON_VEG",
      shortDescription: "Bone-in chicken slow-cooked in Andhra-style pickle masala.",
      basePrice: 399,
      offerPrice: 399,
      spiceLevel: "HIGH",
      status: "ACTIVE",
      isBestSeller: true,
      image: "/images/chicken.jpg",
      variants: [{ label: "400g", price: 399, weightGrams: 400, stock: 30, isDefault: true }],
    },
    {
      name: "Prawn Pickle",
      slug: "prawn-pickle",
      sku: "RCH-PRW-001",
      categoryId: pickles.id,
      type: "NON_VEG",
      shortDescription: "Fresh coastal prawns simmered in a fiery Andhra-style pickle base.",
      basePrice: 429,
      offerPrice: 429,
      spiceLevel: "HIGH",
      status: "ACTIVE",
      image: "/images/prawn.jpg",
      variants: [{ label: "400g", price: 429, weightGrams: 400, stock: 25, isDefault: true }],
    },
    {
      name: "Murukulu",
      slug: "murukulu",
      sku: "RCH-MUR-001",
      categoryId: snacks.id,
      type: "VEG",
      shortDescription: "Crispy spiral rice-and-urad-dal crackers, hand-pressed and fried in small batches.",
      basePrice: 149,
      spiceLevel: "LOW",
      status: "ACTIVE",
      image: "/images/murukulu.jpg",
      variants: [
        { label: "200g", price: 149, weightGrams: 200, stock: 60, isDefault: true },
        { label: "500g", price: 329, weightGrams: 500, stock: 30 },
      ],
    },
    {
      name: "Chekkalu",
      slug: "chekkalu",
      sku: "RCH-CHE-001",
      categoryId: snacks.id,
      type: "VEG",
      shortDescription: "Thin, crisp, traditional rice crackers seasoned with sesame and curry leaf.",
      basePrice: 139,
      spiceLevel: "LOW",
      status: "ACTIVE",
      image: "/images/chekkalu.jpg",
      variants: [
        { label: "200g", price: 139, weightGrams: 200, stock: 55, isDefault: true },
        { label: "500g", price: 309, weightGrams: 500, stock: 25 },
      ],
    },
    {
      name: "Karam Podi",
      slug: "karam-podi",
      sku: "RCH-KRM-001",
      categoryId: podis.id,
      type: "VEG",
      shortDescription: "Stone-ground gunpowder podi — roasted lentils, chilli and garlic.",
      basePrice: 179,
      spiceLevel: "HIGH",
      status: "ACTIVE",
      isBestSeller: true,
      image: "/images/karampodi.jpg",
      variants: [
        { label: "200g", price: 179, weightGrams: 200, stock: 55, isDefault: true },
        { label: "500g", price: 389, weightGrams: 500, stock: 25 },
      ],
    },
    {
      name: "Ruchulu Traditional Gift Box",
      slug: "ruchulu-traditional-gift-box",
      sku: "RCH-GFT-001",
      categoryId: hampers.id,
      type: "VEG",
      shortDescription: "A box full of tradition and love — a curated selection of our best-loved pickles, podi and snacks.",
      basePrice: 899,
      offerPrice: 899,
      status: "ACTIVE",
      isFeatured: true,
      image: "/images/giftbox.jpg",
      variants: [{ label: "Gift Box", price: 899, stock: 15, isDefault: true }],
    },
  ];

  for (const p of sampleProducts) {
    const { variants, image, ...productData } = p;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: productData,
    });

    const existingImage = await prisma.productImage.findFirst({ where: { productId: product.id } });
    if (!existingImage) {
      await prisma.productImage.create({ data: { productId: product.id, url: image, sortOrder: 0 } });
    }

    for (const v of variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: `${product.sku}-${v.label.replace(/\s/g, "")}` },
        update: {},
        create: {
          productId: product.id,
          label: v.label,
          sku: `${product.sku}-${v.label.replace(/\s/g, "")}`,
          price: v.price,
          weightGrams: v.weightGrams,
          isDefault: !!v.isDefault,
        },
      });

      const existingInventory = await prisma.inventory.findUnique({ where: { variantId: variant.id } });
      if (!existingInventory) {
        await prisma.inventory.create({
          data: { productId: product.id, variantId: variant.id, warehouseId: warehouse.id, quantity: v.stock },
        });
      }
    }
  }

  // --- Sample coupon ---
  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      description: "10% off your first order",
      type: "PERCENTAGE",
      value: 10,
      minOrderAmount: 300,
      maxDiscountAmount: 150,
      usageLimitPerUser: 1,
      isActive: true,
    },
  });

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

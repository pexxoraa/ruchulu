const router = require("express").Router();
const multer = require("multer");
const ApiResponse = require("../../utils/ApiResponse");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { requireAuth, requireRole } = require("../../middlewares/auth");
const storageService = require("./storage.service");

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    if ([...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].includes(file.mimetype)) return cb(null, true);
    cb(ApiError.badRequest("Unsupported file type. Allowed: JPEG, PNG, WebP, AVIF, MP4, WebM"));
  },
});

/**
 * @openapi
 * /uploads:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload a single image or video (product photos, avatars, review media) — admin/manager
 *     description: Requires S3-compatible storage to be configured (S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY in .env) — otherwise returns a clear "not configured" error rather than failing silently.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary }
 *               folder: { type: string, default: products, description: "Storage folder, e.g. 'products', 'avatars'" }
 *     responses:
 *       201: { description: "File uploaded — returns its public URL" }
 *       400: { description: "No file uploaded, unsupported type, or storage not configured" }
 */
router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest("No file uploaded (expected multipart field name 'file')");

    const folder = req.body.folder || "products";
    const url = await storageService.uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype, folder);

    new ApiResponse(201, { url, isVideo: ALLOWED_VIDEO_TYPES.includes(req.file.mimetype) }, "File uploaded").send(res);
  })
);

/**
 * @openapi
 * /uploads/review-media:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload a photo/video to attach to a product review (any logged-in customer)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201: { description: "File uploaded — returns its public URL to include in POST /reviews" }
 *       400: { description: "No file uploaded, unsupported type, or storage not configured" }
 */
// Customers can upload review photos/videos too, without full staff access.
router.post(
  "/review-media",
  requireAuth,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest("No file uploaded (expected multipart field name 'file')");
    const url = await storageService.uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype, "reviews");
    new ApiResponse(201, { url, isVideo: ALLOWED_VIDEO_TYPES.includes(req.file.mimetype) }, "File uploaded").send(res);
  })
);

module.exports = router;

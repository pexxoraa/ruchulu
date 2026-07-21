const crypto = require("crypto");
const path = require("path");
const env = require("../../config/env");
const logger = require("../../utils/logger");
const ApiError = require("../../utils/ApiError");

let s3Client = null;

function getClient() {
  if (s3Client) return s3Client;
  if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY || !env.S3_BUCKET) return null;

  // Lazy-required so @aws-sdk is only needed when storage is configured.
  // npm i @aws-sdk/client-s3 @aws-sdk/lib-storage to enable this.
  const { S3Client } = require("@aws-sdk/client-s3");
  s3Client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT || undefined,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
    forcePathStyle: true, // required for MinIO / most R2/Spaces setups
  });
  return s3Client;
}

function buildKey(originalName, folder = "uploads") {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(16).toString("hex");
  return `${folder}/${Date.now()}-${hash}${ext}`;
}

/**
 * uploadBuffer — pushes a file buffer (from Multer's memory storage) to
 * the configured S3-compatible bucket and returns its public URL.
 * Requires `@aws-sdk/client-s3` to be installed and S3_* env vars set;
 * throws a clear, actionable error otherwise rather than silently
 * pretending the upload worked.
 */
async function uploadBuffer(buffer, originalName, mimeType, folder = "uploads") {
  const client = getClient();
  if (!client) {
    throw ApiError.badRequest(
      "File storage is not configured. Set S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY (or point at MinIO/R2/Spaces) and install @aws-sdk/client-s3."
    );
  }

  const { PutObjectCommand } = require("@aws-sdk/client-s3");
  const key = buildKey(originalName, folder);

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ACL: "public-read",
      })
    );
  } catch (err) {
    logger.error({ err, key }, "S3 upload failed");
    throw ApiError.internal("File upload failed. Please try again.");
  }

  const base = env.S3_PUBLIC_BASE_URL || `${env.S3_ENDPOINT}/${env.S3_BUCKET}`;
  return `${base.replace(/\/$/, "")}/${key}`;
}

async function deleteObject(key) {
  const client = getClient();
  if (!client) return;
  const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
  await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key })).catch((err) => {
    logger.error({ err, key }, "S3 delete failed");
  });
}

module.exports = { uploadBuffer, deleteObject };

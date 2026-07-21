const router = require("express").Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validate = require("../../middlewares/validate");
const { requireAuth, requireRole } = require("../../middlewares/auth");
const { parsePagination, buildMeta } = require("../../utils/helpers");

const createTicketSchema = z.object({
  subject: z.string().min(3).max(150),
  message: z.string().min(5).max(2000),
  orderId: z.string().uuid().optional(),
});
const replySchema = z.object({ message: z.string().min(1).max(2000) });
const statusSchema = z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]) });
const idParamSchema = z.object({ id: z.string().uuid() });

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const isStaff = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(req.user.role);
    const where = isStaff ? {} : { userId: req.user.id };

    const [items, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { fullName: true, email: true } }, replies: true },
      }),
      prisma.supportTicket.count({ where }),
    ]);
    new ApiResponse(200, items, "Tickets fetched", buildMeta({ page, limit, total })).send(res);
  })
);

router.post(
  "/",
  validate({ body: createTicketSchema }),
  asyncHandler(async (req, res) => {
    const ticket = await prisma.supportTicket.create({ data: { ...req.body, userId: req.user.id } });
    new ApiResponse(201, ticket, "Support ticket created").send(res);
  })
);

router.get(
  "/:id",
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const isStaff = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(req.user.role);
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.id },
      include: { replies: { orderBy: { createdAt: "asc" } }, user: { select: { fullName: true, email: true } } },
    });
    if (!ticket) throw ApiError.notFound("Ticket not found");
    if (!isStaff && ticket.userId !== req.user.id) throw ApiError.forbidden("Access denied");
    new ApiResponse(200, ticket).send(res);
  })
);

router.post(
  "/:id/replies",
  validate({ params: idParamSchema, body: replySchema }),
  asyncHandler(async (req, res) => {
    const isStaff = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(req.user.role);
    const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
    if (!ticket) throw ApiError.notFound("Ticket not found");
    if (!isStaff && ticket.userId !== req.user.id) throw ApiError.forbidden("Access denied");

    const reply = await prisma.ticketReply.create({
      data: { ticketId: ticket.id, authorId: req.user.id, message: req.body.message, isStaff },
    });
    if (isStaff && ticket.status === "OPEN") {
      await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "IN_PROGRESS" } });
    }
    new ApiResponse(201, reply, "Reply added").send(res);
  })
);

router.patch(
  "/:id/status",
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  validate({ params: idParamSchema, body: statusSchema }),
  asyncHandler(async (req, res) => {
    const ticket = await prisma.supportTicket.update({ where: { id: req.params.id }, data: req.body });
    new ApiResponse(200, ticket, "Ticket status updated").send(res);
  })
);

module.exports = router;

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  const normalizedMessage = (err.message || "").trimStart();

  if (err.code === "P2002") {
    const field = err.meta?.target?.[0] || "Field";
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  if (err.code === "P2007") {
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Resource not found",
    });
  }

  if (err.name === "PrismaClientValidationError" || normalizedMessage.startsWith("Invalid `prisma.")) {
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
    });
  }

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";
  const safeMessage =
    statusCode === 500 && isProduction ? "Internal server error" : err.message || "Internal server error";

  return res.status(statusCode).json({
    success: false,
    message: safeMessage,
    ...(err.details ? { details: err.details } : {}),
    ...(err.incompletePrerequisites ? { incompletePrerequisites: err.incompletePrerequisites } : {}),
  });
};

module.exports = { errorHandler };

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);

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

  if (err.name === "PrismaClientValidationError" || /^Invalid `prisma\./.test(err.message || "")) {
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
    });
  }

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
  });
};

module.exports = { errorHandler };

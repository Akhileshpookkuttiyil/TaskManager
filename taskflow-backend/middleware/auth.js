const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { sendError } = require("../utils/response");
const { serializeUser } = require("../utils/serializers");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, "Not authorized, no token", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return sendError(res, "User not found", 401);
    }

    // Attach user to request in the Mongo-compatible shape expected by controllers.
    req.user = serializeUser(user);

    next();
  } catch (error) {
    return sendError(res, "Not authorized, invalid token", 401);
  }
};

module.exports = { protect };

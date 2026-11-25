import jwt from "jsonwebtoken";

const adminProtect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith("Bearer")
      ? authHeader.split(" ")[1]
      : null;

  if (!token) {
    return res.status(401).json({ message: "Admin authentication required." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Admin session expired. Please log in again." });
  }
};

export default adminProtect;

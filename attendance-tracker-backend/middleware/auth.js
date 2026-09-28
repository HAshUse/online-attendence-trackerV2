import jwt from "jsonwebtoken";
// import Teacher from "../models/Teacher.js";

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication required. Please log in to continue." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // ✅ THIS
    next();
  } catch (err) {
    return res.status(401).json({ message: "Your session has expired. Please log in again." });
  }
};
export default authMiddleware;
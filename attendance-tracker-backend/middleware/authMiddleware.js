import jwt from "jsonwebtoken";
import Teacher from "../models/Teacher.js";

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication required. Please log in to continue." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await Teacher.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "Teacher account not found. Please log in again." });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Your session has expired. Please log in again." });
  }
};

export default protect;

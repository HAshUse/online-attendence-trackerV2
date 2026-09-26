import Teacher from "../models/Teacher.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/**
 * @desc Register Teacher
 * @route POST /api/teachers/register
 */
export const registerTeacher = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2. Check existing teacher
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ message: "Teacher already exists" });
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create teacher
    const teacher = await Teacher.create({
      name,
      email,
      password: hashedPassword
    });

    // 5. Generate token for instant login
    const token = jwt.sign(
      { id: teacher._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Teacher registered successfully",
      token,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/**
 * @desc Login Teacher
 * @route POST /api/teachers/login
 */
export const loginTeacher = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validation
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2. Check teacher
    const teacher = await Teacher.findOne({ email });
    if (!teacher) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 4. Generate token
    const token = jwt.sign(
      { id: teacher._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
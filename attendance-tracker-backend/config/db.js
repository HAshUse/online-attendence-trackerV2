import dns from "dns";
import mongoose from "mongoose";

try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (dnsErr) {
  // Ignore in restricted environments
}

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");
  } catch (error) {
    console.error("MongoDB connection failed ❌", error);
    process.exit(1);
  }
};

export default connectDB;

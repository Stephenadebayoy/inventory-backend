/** @format */

import express, { Application, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDb from "./config/dbConnection";
import authRoutes from "./routes/auth/authRoute";
dotenv.config();

// Initialize Express app
const app: Application = express();

// Connect to database
connectDb();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
// Root route
app.get("/", (req: Request, res: Response) => {
  res.send("API is running...");
});

// Global error handler
// app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
//   console.error(err.message);
//   res.status(500).json({ message: "Server Error", error: err.message });
// });
// app.use(errorHandler);

// Define port
const PORT = process.env.PORT || 5002;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

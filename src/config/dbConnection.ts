/** @format */
import mongoose from "mongoose";

const connectDb = async (): Promise<void> => {
  try {
    // Validate the CONNECTION_STRING environment variable
    const connectionString = process.env.CONNECTION_STRING;
    if (!connectionString) {
      throw new Error(
        "❌ CONNECTION_STRING environment variable is not defined"
      );
    }

    const options: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: 10000,
    };

    await mongoose.connect(connectionString, options);
    console.log(
      `✅ Database connected: ${mongoose.connection.host}/${mongoose.connection.name}`
    );
  } catch (err) {
    console.error("❌ Database connection error:", err);
    process.exit(1); // Exit the application if the connection fails
  }
};

export default connectDb;

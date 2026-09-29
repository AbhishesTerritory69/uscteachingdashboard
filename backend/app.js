const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const authRoutes = require("./src/routes/authRoutes");
const courseOutlineRoutes = require("./src/routes/courseOutlineRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const dataSourceRoutes = require("./src/routes/dataSourceRoutes");
const importRoutes = require("./src/routes/importRoutes");
const resourceRoutes = require("./src/routes/resourceRoutes");

const app = express();
const corsOrigins = new Set(
  (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/course-outlines", courseOutlineRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/data-sources", dataSourceRoutes);
app.use("/api/imports", importRoutes);
app.use("/api", resourceRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "College Website API is running"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy"
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found."
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  const status = error.status === 400 ? 400 : 500;
  res.status(status).json({
    success: false,
    message: status === 400 ? "Malformed request body." : "An unexpected server error occurred."
  });
});

module.exports = app;
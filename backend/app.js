const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./src/routes/authRoutes");
const resourceRoutes = require("./src/routes/resourceRoutes");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
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

module.exports = app;
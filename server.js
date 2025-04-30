const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
// const fileUpload = require('express-fileupload');
//mmorgan add
const morgan = require("morgan");

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan("dev"));

// app.use(fileUpload());
// app.use('/uploads', express.static('uploads'));
//upload route foolder import
const { fileRouter } = require("./routes/upload");
const blogRouter = require("./routes/blog");
const faqRouter = require("./routes/faq");
const pageRouter = require("./routes/page");

// Import Controllers
const authController = require("./controllers/Main/AuthController");

// Import Middleware
const { auth, restrictTo } = require("./utils/AuthMiddleware");

// Auth Routes
app.post("/api/auth/register", authController.register);
app.post("/api/auth/login", authController.login);
app.get("/api/auth/profile", auth, authController.getProfile);

// Verification routes
app.post("/api/auth/verify", authController.verifyAccount);
app.post("/api/auth/resend-verification", authController.resendVerification);

// Service Category Routes

//upload route
app.use("/api", fileRouter);
app.use("/api", blogRouter);
app.use("/api", faqRouter);
app.use("/api", pageRouter);

//add main ednpiutn get hello world
app.get("/", (req, res) => {
  res.send("Hello World");
});

//https://fix-services.vercel.app/

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API Server Running on Port ${PORT}`);
});

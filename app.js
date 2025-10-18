require("dotenv").config();
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const fileUpload = require("express-fileupload");
const swaggerUi = require("swagger-ui-express");
const session = require("express-session");
const flash = require("connect-flash");

const HOST = "0.0.0.0";
const PORT = process.env.PORT || 4000;

const indexRouter = require("./routes/index");
const adminRouter = require("./routes/adminRouter")();
const usersRouter = require("./routes/userRoute")();
const app = express();

// Connect to Database
require("./dbConnection").connectdb();

// View Engine Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(logger("dev"));
app.use(express.static(path.join(__dirname, "public")));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable file upload using express-fileupload
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

// ✅ Session Middleware - Must be before `flash()`
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 365 * 1000 },
  })
);

// Add this right after your session setup middleware
app.use(function (req, res, next) {
  res.locals.userSite_session = req.session.user || null;
  next();
});

// ✅ Flash Middleware
app.use(flash());

// ✅ Set Flash Messages in `res.locals` - After `flash()`
app.use((req, res, next) => {
  res.locals.msg = req.flash("msg");
  res.locals.error = req.flash("error");
  next();
});

// Swagger Documentation Setup
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    urls: [
      { url: "/user", name: "User API" },
    ],
  },
};
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(null, swaggerOptions));

// Routes
app.use("/", indexRouter);
app.use("/admin", adminRouter);
app.use("/users", usersRouter);

// 404 Error Handler
app.use((req, res, next) => {
  next(createError(404));
});

// Global Error Handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

// Start Server
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

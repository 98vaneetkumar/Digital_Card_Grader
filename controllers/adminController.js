"use strict";

/* RENDER: when displaying views/templates with data (forms/errors/user-data) [URL stays same]
 REDIRECT: after successful actions to prevent resubmission (form-success/logout/cancel) [URL changes]*/

const bcrypt = require("bcrypt");
const { Op, fn, col } = require("sequelize");
const moment = require("moment");
const Models = require("../models/index");
const helper = require("../helpers/commonHelper");
const fs = require("fs");
const path = require("path");

module.exports = {
  login_page: async (req, res) => {
    if (req.session.user) return res.redirect("/admin/dashboard");
    res.render("admin/login_page", { layout: false, msg: req.flash("msg") });
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const login_data = await Models.userModel.findOne({
        where: { email: email },
      });

      if (!login_data || !bcrypt.compareSync(password, login_data.password)) {
        return res.json({
          success: false,
          message: "Invalid email or password",
        });
      }

      if (login_data.role !== 0) {
        return res.json({
          success: false,
          message: "Please enter valid credentials",
        });
      }

      req.session.user = login_data;
      req.flash("msg", "You are logged in successfully");

      return res.json({
        success: true,
        message: "You are logged in successfully",
      });
    } catch (error) {
      console.error("Login Error:", error);
      return res.redirect("/admin/login");
    }
  },

  logout: async (req, res) => {
    try {
      req.session.destroy(() => {
        res.json({ success: true });
      });
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  profile: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/admin/login");
      res.render("admin/profile", {
        title: "Profile",
        session: req.session.user,
        msg: req.flash("msg"),
        error: req.flash("error"),
      });
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  profile_update: async (req, res) => {
    try {
      let fileImage = "";

      if (req.files && req.files.profilePicture) {
        fileImage = await helper.fileUpload(req.files.profilePicture, "images");
      } else {
        let user = await Models.userModel.findOne({
          where: { id: req.params.id },
        });

        fileImage = user.profilePicture;
      }

      // Update user profile
      await Models.userModel.update(
        {
          name: req.body.name,
          profilePicture: fileImage,
        },
        { where: { id: req.params.id } }
      );

      // Fetch updated user
      let updatedUser = await Models.userModel.findOne({
        where: { id: req.params.id },
      });
      if (updatedUser) {
        req.session.user = updatedUser;
      }

      req.flash("msg", "Profile updated successfully");
      res.redirect("/admin/dashboard");
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  csvList: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/admin/login");

      // Use project root to get correct folder
      const csvFolder = path.join(process.cwd(), "public", "csv");
      console.log("Looking in folder:", csvFolder);

      let csvFiles = [];
      if (fs.existsSync(csvFolder)) {
        csvFiles = fs.readdirSync(csvFolder)
          .filter(f => f.endsWith(".csv"))
          .map((file, i) => ({
            id: i + 1,
            name: file
          }));
      }

      console.log("csvFiles found:", csvFiles);

      res.render("admin/csv/csvList", {
        title: "Upload CSV",
        session: req.session.user,
        msg: req.flash("msg"),
        error: req.flash("error"),
        csvFiles
      });
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  csvUpload: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/admin/login");
      res.render("admin/csv/csvUpload", {
        title: "Upload CSV",
        session: req.session.user,
        msg: req.flash("msg"),
        error: req.flash("error"),
      });
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  csvDataUpload: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/admin/login");

      if (!req.files || !req.files.csvFile) {
        req.flash("error", "No file uploaded ❌");
        return res.redirect("/admin/csvUpload");
      }

      const file = req.files.csvFile;
      const success = await helper.csvFileUploadAndAppend(file);

      if (!success) {
        req.flash("error", "Failed to upload or invalid file format ❌");
        return res.redirect("/admin/csvUpload");
      }

      // ✅ The helper saves files to /public/csv/
      const uploadPath = path.join(__dirname, "..", "public", "csv", file.name);

      // Some JSONs are converted to CSV (filename changes)
      let finalPath = uploadPath;
      if (!fs.existsSync(uploadPath)) {
        // Check if converted JSON→CSV file exists instead
        const convertedName = file.name.replace(/\.json$/i, ".csv");
        finalPath = path.join(__dirname, "..", "public", "csv", convertedName);
      }

      // ✅ Ensure file exists before reading
      if (!fs.existsSync(finalPath)) {
        console.error("❌ Uploaded file not found at:", finalPath);
        req.flash("error", "Uploaded file not found ❌");
        return res.redirect("/admin/csvUpload");
      }

      const fileContent = fs.readFileSync(finalPath, "utf8");
      const fileType = file.name.endsWith(".json") ? "json" : "csv";

      await Models.fileBackupsModel.create({
        filename: file.name,
        fileType,
        content: fileContent,
        uploadedBy: req.session.user.email || "admin",
        uploadedAt: new Date(),
      });

      req.flash("msg", "File uploaded & stored in DB successfully ✅");
      res.redirect("/admin/csvList");
    } catch (error) {
      console.error(error);
      req.flash("error", "An unexpected error occurred ❌");
      res.redirect("/admin/csvUpload");
    }
  },

  viewCsv: async (req, res) => {
    try {
      const { id } = req.body; // get CSV index from POST request
      const csvFolder = path.join(process.cwd(), "public", "csv");
      const csvFiles = fs.readdirSync(csvFolder).filter(f => f.endsWith(".csv"));

      const index = parseInt(id) - 1;
      if (!csvFiles[index]) return res.json({ success: false, message: "CSV file not found ❌" });

      const fileName = csvFiles[index];
      const filePath = path.join(csvFolder, fileName);

      if (!fs.existsSync(filePath)) return res.json({ success: false, message: "CSV file not found ❌" });

      // Read CSV content
      const csvContent = fs.readFileSync(filePath, "utf8");
      return res.json({ success: true, data: csvContent, name: fileName });

    } catch (error) {
      console.log("❌ viewCsv error:", error);
      return res.json({ success: false, message: "Server error ❌" });
    }
  },

  deleteCsv: async (req, res) => {
    try {
      const { id } = req.body; // assuming 'id' or file index from frontend

    // CSV folder path
    const csvFolder = path.join(process.cwd(), "public", "csv");
    const csvFiles = fs.readdirSync(csvFolder).filter((f) => f.endsWith(".csv"));

    // Validate
    const index = parseInt(id) - 1;
    if (!csvFiles[index]) return res.json({ success: false, msg: "Invalid file ID" });

    const fileName = csvFiles[index];
    const filePath = path.join(csvFolder, fileName);

    // 🔹 STEP 1: Read data to remove (for all_cards.csv cleanup)
    let csvToRemove = [];
    if (fs.existsSync(filePath)) {
      csvToRemove = fs.readFileSync(filePath, "utf8").trim().split("\n").slice(1); // skip header
    }

    // 🔹 STEP 2: Delete from /public/csv/
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // 🔹 STEP 3: Delete from /data/all_cards.csv
    const pokemonCsvPath = path.join(process.cwd(), "data", "all_cards.csv");
    if (fs.existsSync(pokemonCsvPath) && csvToRemove.length > 0) {
      const existingCsv = fs.readFileSync(pokemonCsvPath, "utf8").trim().split("\n");
      const filtered = existingCsv.filter((row) => !csvToRemove.includes(row));
      fs.writeFileSync(pokemonCsvPath, filtered.join("\n"), "utf8");
    }

    // 🔹 STEP 4: Delete from DB (fileBackups)
    const deleted = await Models.fileBackupsModel.destroy({
      where: { filename: fileName },
    });

    if (deleted === 0) {
      console.warn(`⚠️ No DB entry found for ${fileName}`);
    }

    return res.json({ success: true, msg: "File and DB record deleted successfully ✅" });

    } catch (error) {
      console.log("❌ deleteCsv error:", error);
      return res.json({ success: false });
    }
  },

  change_password: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");
      res.render("admin/changePassword", {
        title: "Reset Password",
        session: req.session.user,
        msg: req.flash("msg"),
        error: req.flash("error"),
      });
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  change_password_post: async (req, res) => {
    try {
      if (!req.session) {
        console.error("Session is not initialized!");
        return res.status(500).json({ error: "Session not initialized." });
      }

      const { password, new_password, confirm_new_password } = req.body;
      const userId = req.session.user?.id;

      if (!userId) {
        return res
          .status(401)
          .json({ error: "User not found. Please log in again." });
      }

      const user = await Models.userModel.findOne({ where: { id: userId } });

      if (!user) {
        return res
          .status(401)
          .json({ error: "User not found. Please log in again." });
      }

      const isPasswordMatch = await bcrypt.compare(password, user.password);

      if (!isPasswordMatch) {
        return res
          .status(400)
          .json({ error: "Your old password is incorrect." });
      }

      if (new_password !== confirm_new_password) {
        return res
          .status(400)
          .json({ error: "New password and confirm password do not match." });
      }

      const hashedPassword = await bcrypt.hash(new_password, 10);
      await Models.userModel.update(
        { password: hashedPassword },
        { where: { id: userId } }
      );

      // Destroy session and send a success response
      req.session.destroy();
      return res.json({
        success: true,
        message: "Your password has been updated successfully!",
      });
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  dashboard: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/admin/login");

      const [
        user,

      ] = await Promise.all([
        Models.userModel.count({ where: { role: 1, otpVerify: 1 } }),

      ]);

      const currentYear = Math.max(2025, moment().year());
      const months = [];
      const counts = { users: [], churches: [], business: [], nonprofit: [] };

      const startOfYear = moment(`${currentYear}-01-01`)
        .startOf("year")
        .toDate();
      const endOfYear = moment(startOfYear).endOf("year").toDate();

      const users = await Models.userModel.findAll({
        attributes: [
          [fn("MONTH", col("createdAt")), "month"],
          "role",
          "otpVerify",
        ],
        where: {
          createdAt: { [Op.between]: [startOfYear, endOfYear] },
        },
        raw: true,
      });

      // Initialize monthly arrays
      for (let month = 1; month <= 12; month++) {
        months.push(moment(`${currentYear}-${month}-01`).format("MMM, YYYY"));
        counts.users.push(0);
      }

      // Count based on JS logic
      users.forEach(({ month, role, otpVerify, subscriptionStatus }) => {
        const index = parseInt(month) - 1;
        if (index < 0 || index > 11) return;

        switch (role) {
          case 1:
            if (otpVerify == 1) counts.users[index]++;
            break;
        }
      });

      res.render("dashboard", {
        title: "Dashboard",
        counts1: counts,
        months1: months,
        user,
        session: req.session.user,
      });
    } catch (error) {
      console.error("Dashboard Error:", error);
      return res.redirect("/admin/login");
    }
  },

  getDashboardData: async (req, res) => {
    try {
      const year = parseInt(req.query.year) || moment().year();
      const chartType = req.query.chartType;

      // Ensure the requested year is within the valid range
      if (year < 2024) {
        return res.status(400).json({
          success: false,
          error: "Year must be 2024 or later",
        });
      }

      const startOfYear = moment(`${year}-01-01`).startOf("year").toDate();
      const endOfYear = moment(startOfYear).endOf("year").toDate();

      // Define role based on chart type
      let role;
      switch (chartType) {
        case "users":
          role = 1;
          break;
      }

      let query = {
        attributes: [
          [fn("MONTH", col("createdAt")), "month"],
          [fn("COUNT", col("id")), "count"],
        ],
        where: {
          createdAt: { [Op.between]: [startOfYear, endOfYear] },
        },
        group: ["month"],
        raw: true,
      };

      // Apply role filter if chartType is specified
      if (role) {
        query.where.role = role;
      }
      if (role == 1) {
        query.where.otpVerify = 1;
      }

      const monthlyCounts = await Models.userModel.findAll(query);

      // Initialize an array with 12 months set to zero
      const counts = new Array(12).fill(0);

      // Populate counts where data is available
      monthlyCounts.forEach(({ month, count }) => {
        counts[month - 1] = parseInt(count);
      });

      // Generate months labels
      const months = Array.from({ length: 12 }, (_, i) =>
        moment(`${year}-${i + 1}-01`).format("MMM")
      );

      res.json({
        success: true,
        counts: { [chartType]: counts },
        months,
      });
    } catch (error) {
      console.error("Dashboard Data Error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },

  aboutUs: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/admin/login");

      let about_data = await Models.cmsModel.findOne({
        where: { type: 1 },
      });

      // Use res.render instead of res.redirect to render the "about" page
      return res.render("admin/cms/about", {
        title: "About Us",
        about_data,
        session: req.session.user,
        msg: req.flash("msg"),
        error: req.flash("error"),
      });
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  about_post: async (req, res) => {
    try {
      let about_data = await Models.cmsModel.update(
        {
          title: req.body.title,
          description: req.body.description,
        },
        {
          where: { type: 1 },
        }
      );
      req.flash("msg", "About Us updated successfully");
      res.redirect("back");
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  privacyPolicy: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/admin/login");
      let policy_data = await Models.cmsModel.findOne({
        where: { type: 2 },
      });
      res.render("admin/cms/privacy", {
        title: "Privacy Policy",
        policy_data,
        session: req.session.user,
        msg: req.flash("msg"),
        error: req.flash("error"),
      });
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  privacy_post: async (req, res) => {
    try {
      let data = await Models.cmsModel.update(
        {
          title: req.body.title,
          description: req.body.description,
        },
        {
          where: { type: 2 },
        }
      );
      req.flash("msg", "Privacy Policy updated successfully");
      res.redirect("back");
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  termsConditions: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/admin/login");
      let terms_data = await Models.cmsModel.findOne({
        where: { type: 3 },
      });
      res.render("admin/cms/terms", {
        title: "Terms & Conditions",
        terms_data,
        session: req.session.user,
        msg: req.flash("msg"),
        error: req.flash("error"),
      });
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  termsConditionsPost: async (req, res) => {
    try {
      let data = await Models.cmsModel.update(
        {
          title: req.body.title,
          description: req.body.description,
        },
        {
          where: { type: 3 },
        }
      );
      req.flash("msg", "Terms and Conditions updated successfully");
      res.redirect("back");
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  users_listing: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/admin/login");
      let user_data = await Models.userModel.findAll({
        where: {
          role: 1,
          otpVerify: 1,
        },
        order: [["createdAt", "DESC"]],
        raw: true,
      });
      res.render("admin/users/usersListing", {
        session: req.session.user,
        msg: req.flash("msg"),
        error: req.flash("error"),
        title: "Users",
        user_data,
      });
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  user_view: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/admin/login");

      let userId = req.params.id;

      // Find user details
      let data = await Models.userModel.findOne({
        where: { id: userId },
      });

      let userCards = await Models.userCardsModel.findAll({
        where: { userId: userId },
        order: [["createdAt", "DESC"]],
      });

      console.log("User Cards:", userCards);

      res.render("admin/users/userView", {
        title: "Users",
        data,
        userCards, // pass cards to template
        session: req.session.user,
        msg: req.flash("msg"),
        error: req.flash("error"),
      });
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  user_status: async (req, res) => {
    try {
      const { id, status } = req.body;
      console.log(`Updating user ${id} to status: ${status}`); // Debugging

      if (!id || status === undefined) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid data provided" });
      }

      const [updatedRows] = await Models.userModel.update(
        { status },
        { where: { id } }
      );

      if (updatedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found or status unchanged",
        });
      }

      res.json({
        success: true,
        message: "Status changed successfully",
        status,
      });
    } catch (error) {
      console.log("Error updating user status:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
      return res.redirect("/admin/login");
    }
  },

  user_delete: async (req, res) => {
    try {
      const userId = req.body.id;
      // Delete user
      await Models.userModel.destroy({ where: { id: userId } });
      res.json({ success: true });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to delete user " });
      return res.redirect("/admin/login");
    }
  },

  faq_list: async (req, res) => {
    try {
      let title = "Faq";
      let faqData = await Models.faqModel.findAll({
        order: [["createdAt", "DESC"]],
      });

      res.render("admin/faq/faqListing", {
        title,
        faqData,
        session: req.session.user,
        msg: req.flash("msg") || "",
      });
    } catch (error) {
      console.log(error);
      res.redirect("/admin/add_faq");
    }
  },

  add_faq: async (req, res) => {
    try {
      let title = "Faq";
      res.render("admin/faq/faq_add", {
        title,
        session: req.session.user,
      });
    } catch (error) {
      console.log(error);
      res.redirect("/admin/add_faq");
    }
  },

  create_faq: async (req, res) => {
    try {
      const { question, answer } = req.body;
      await Models.faqModel.create({
        question: question,
        answer: answer,
      });

      req.flash("msg", "Faq added successfully.");
      res.redirect("/admin/faq_list");
    } catch (error) {
      console.log(error);
      req.flash("msg", "An error occurred while adding the FAQ.");
      res.redirect("/admin/add_faq");
    }
  },

  delete_faq: async (req, res) => {
    try {
      await Models.faqModel.destroy({
        where: {
          id: req.body.id,
        },
      });

      res.redirect("/admin/faq_list");
    } catch (error) {
      console.log(error);
      res.redirect("/admin/faq_list");
    }
  },

  faq_edit: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/admin/login");

      let faqId = req.params.id;

      let data = await Models.faqModel.findOne({
        where: { id: faqId },
      });
      res.render("admin/faq/faqEdit", {
        title: "Faq",
        data,
        session: req.session.user,
        msg: req.flash("msg"),
        error: req.flash("error"),
      });
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  faq_update: async (req, res) => {
    try {
      const faqId = req.params.id;
      const { question, answer } = req.body;

      await Models.faqModel.update(
        {
          question: question,
          answer: answer,
        },
        { where: { id: faqId } }
      );

      req.flash("msg", "FAQ updated successfully");
      res.redirect("/admin/faq_list");
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

  faq_view: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/admin/login");

      let faqId = req.params.id;

      let data = await Models.faqModel.findOne({
        where: { id: faqId },
      });
      res.render("admin/faq/faqView", {
        title: "Faq",
        data,
        session: req.session.user,
        msg: req.flash("msg"),
        error: req.flash("error"),
      });
    } catch (error) {
      console.log(error);
      return res.redirect("/admin/login");
    }
  },

};

"use strict";

const Joi = require("joi");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
// const otpManager = require("node-twillo-otp-manager")(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN,
//   process.env.TWILIO_SERVICE_SID
// );
const secretKey = process.env.SECRET_KEY;

const commonHelper = require("../helpers/commonHelper.js");
const helper = require("../helpers/validation.js");
const Models = require("../models/index");
const Response = require("../config/responses.js");
const fs = require("fs");
const path = require("path");

const {
  RekognitionClient,
  DetectCustomLabelsCommand,
} = require("@aws-sdk/client-rekognition");

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const MODEL_ARN = process.env.MODEL_ARN;

module.exports = {
  signUp: async (req, res) => {
    try {
      const schema = Joi.object().keys({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required(),
        deviceToken: Joi.string().allow("").optional(),
        deviceType: Joi.number().allow("").valid(1, 2).optional(),
      });

      let payload = await helper.validationJoi(req.body, schema);

      const hashedPassword = await commonHelper.bcryptData(
        payload.password,
        process.env.SALT
      );

      let objToSave = {
        name: payload.name,
        lastName: payload.lastName,
        email: payload.email,
        password: hashedPassword,
        deviceToken: payload.deviceToken,
        deviceType: payload.deviceType,
      };

      let response = await Models.userModel.create(objToSave);
      const token = jwt.sign(
        {
          id: response.dataValues.id,
          email: response.dataValues.email,
        },
        secretKey
      );
      response.dataValues.token = token;
      return commonHelper.success(
        res,
        Response.success_msg.registered,
        response
      );
    } catch (error) {
      console.error("Error during sign up:", error);
      return commonHelper.error(res, Response.error_msg.regUser, error.message);
    }
  },

  login: async (req, res) => {
    try {
      const schema = Joi.object().keys({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
        deviceToken: Joi.string().allow("").optional(), // static data, will come from frontend
        deviceType: Joi.number().allow("").valid(1, 2).optional(),
      });
      let payload = await helper.validationJoi(req.body, schema);

      const { email, password } = payload;

      const user = await Models.userModel.findOne({
        where: { email: email },
        raw: true,
      });

      if (!user) {
        return commonHelper.failed(res, Response.failed_msg.userNotFound);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return commonHelper.failed(res, Response.failed_msg.invalidPassword);
      }

      await Models.userModel.update(
        {
          deviceToken: payload.deviceToken,
          deviceType: payload.deviceType,
          verifyStatus: 0,
        },
        {
          where: {
            id: user.id,
          },
        }
      );

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
        },
        secretKey
      );
      user.token = token;
      return commonHelper.success(res, Response.success_msg.login, user);
    } catch (err) {
      console.error("Error during login:", err);
      return commonHelper.error(res, Response.error_msg.loguser, err.message);
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const schema = Joi.object().keys({
        email: Joi.string().email().required(),
      });
      let payload = await helper.validationJoi(req.body, schema);
      const { email } = payload;
      const user = await Models.userModel.findOne({
        where: { email: email },
      });
      if (!user) {
        return commonHelper.failed(res, Response.failed_msg.noAccWEmail);
      }
      const resetToken = await commonHelper.randomStringGenerate(req, res);
      await user.update({
        resetToken: resetToken,
        resetTokenExpires: new Date(Date.now() + 3600000), // 1 hour
      });
      const resetUrl = `${req.protocol}://${await commonHelper.getHost(
        req,
        res
      )}/users/resetPassword?token=${resetToken}`; // Add your URL
      const transporter = await commonHelper.nodeMailer();
      const emailTamplate = await commonHelper.forgetPasswordLinkHTML(
        user,
        resetUrl
      );
      // await transporter.sendMail(emailTamplate);
      return commonHelper.success(res, Response.success_msg.passwordLink);
    } catch (error) {
      console.error("Forgot password error:", error);
      return commonHelper.error(
        res,
        Response.error_msg.forgPwdErr,
        error.message
      );
    }
  },

  resetPassword: async (req, res) => {
    try {
      let data = req.user;
      res.render("changePassword", { data: data });
    } catch (error) {
      console.error("Reset password error:", error);
      return commonHelper.error(
        res,
        Response.error_msg.resetPwdErr,
        error.message
      );
    }
  },

  forgotChangePassword: async (req, res) => {
    try {
      const schema = Joi.object().keys({
        id: Joi.string().required(),
        newPassword: Joi.string().required(),
        confirmPassword: Joi.string().required(),
      });

      let payload = await helper.validationJoi(req.body, schema);
      //Destructing the data
      const { id, newPassword, confirmPassword } = payload;

      if (newPassword !== confirmPassword) {
        return commonHelper.failed(res, Response.failed_msg.pwdNoMatch);
      }

      const user = await Models.userModel.findOne({
        where: { id: id },
        raw: true,
      });
      if (!user) {
        return commonHelper.failed(res, Response.failed_msg.userNotFound);
      }

      const hashedNewPassword = await commonHelper.bcryptData(
        newPassword,
        process.env.SALT
      );

      await Models.userModel.update(
        { password: hashedNewPassword },
        { where: { id: id } }
      );

      return res.render("successPassword", {
        message: Response.success_msg.passwordChange,
      });
    } catch (error) {
      console.error("Error while changing the password", error);
      return commonHelper.error(
        res,
        Response.error_msg.chngPwdErr,
        error.message
      );
    }
  },

  forgetPasswordOTPVerify: async (req, res) => {
    let user = await Models.userModel.findOne({
      where: { email: req.body.email },
    });
    if (!user) {
      return commonHelper.failed(res, Response.failed_msg.userNotFound);
    }
    if (req.body.otp == "1111") {
      await Models.userModel.update(
        { otpVerify: 1 },
        { where: { email: req.body.email } }
      );
      return commonHelper.success(res, Response.success_msg.otpVerify);
    } else {
      return commonHelper.failed(res, "Invalid OTP");
    }
  },

  setNewPassword: async (req, res) => {
    try {
      const schema = Joi.object().keys({
        email: Joi.string().email().required(),
        newPassword: Joi.string().required(),
      });
      let payload = await helper.validationJoi(req.body, schema);

      const { email, newPassword } = payload;
      const user = await Models.userModel.findOne({
        where: { email: email },
      });
      if (!user) {
        return commonHelper.failed(res, Response.failed_msg.userNotFound);
      }
      const hashedNewPassword = await commonHelper.bcryptData(
        newPassword,
        process.env.SALT
      );

      await Models.userModel.update(
        { password: hashedNewPassword },
        { where: { email: req.body.email } }
      );

      return commonHelper.success(res, Response.success_msg.passwordUpdate);
    } catch (error) {
      console.error("Error while changing password", error);
      return commonHelper.error(
        res,
        Response.error_msg.chngPwdErr,
        error.message
      );
    }
  },

  logout: async (req, res) => {
    try {
      const schema = Joi.object().keys({
        deviceToken: Joi.string().required(),
        deviceType: Joi.string().optional(),
      });

      let payload = await helper.validationJoi(req.body, schema);

      let logoutDetail = { deviceToken: payload.deviceToken };

      await Models.userModel.update(logoutDetail, {
        where: { id: req.user.id },
      });

      return commonHelper.success(res, Response.success_msg.logout);
    } catch (error) {
      console.error("Logout error:", error);
      return commonHelper.error(
        res,
        Response.error_msg.logoutErr,
        error.message
      );
    }
  },

  updateProfile: async (req, res) => {
    try {
      const schema = Joi.object().keys({
        firstName: Joi.string().optional(),
        lastName: Joi.string().optional(),
        email: Joi.string().optional().email(),
        phoneNumber: Joi.string().optional(),
      });

      let payload = await helper.validationJoi(req.body, schema);

      if (!req.user || !req.user.id) {
        return commonHelper.failed(res, Response.failed_msg.userIdReq);
      }

      let updateProfile = {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
      };

      await Models.userModel.update(updateProfile, {
        where: { id: req.user.id },
      });

      let response = await Models.userModel.findOne({
        where: { id: req.user.id },
        raw: true,
      });

      return commonHelper.success(
        res,
        Response.success_msg.updateProfile,
        response
      );
    } catch (error) {
      console.error("Error while updating profile", error);
      return commonHelper.error(
        res,
        Response.error_msg.updPrfErr,
        error.message
      );
    }
  },

  changePassword: async (req, res) => {
    try {
      const schema = Joi.object().keys({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string().required(),
      });
      let payload = await helper.validationJoi(req.body, schema);

      const { currentPassword, newPassword } = payload;

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        req.user.password
      );

      if (!isPasswordValid) {
        return commonHelper.failed(res, Response.failed_msg.incorrectCurrPwd);
      }

      const hashedNewPassword = await commonHelper.bcryptData(
        newPassword,
        process.env.SALT
      );

      await Models.userModel.update(
        { password: hashedNewPassword },
        { where: { id: req.user.id } }
      );

      return commonHelper.success(res, Response.success_msg.passwordUpdate);
    } catch (error) {
      console.error("Error while changing password", error);
      return commonHelper.error(
        res,
        Response.error_msg.chngPwdErr,
        error.message
      );
    }
  },

  // sidId is only created once. not everytime
  sidIdGenerate: async (req, res) => {
    try {
      const serviceSid = await commonHelper.sidIdGenerateTwilio(req, res);
      if (!serviceSid) throw new Error("Service SID not generated");
      console.log("==>", serviceSid);
      res.send(serviceSid);
    } catch (error) {
      console.log("error");
      throw error;
    }
  },

  otpSend: async (req, res) => {
    try {
      // if phone number and country code is in different key. then concatinate it.

      //const phone = req.body.countryCode + req.body.phoneNumber;

      const { phone } = req.body; // "+911010101010"; Replace with dynamic input
      const userExist = await Models.userModel.findOne({
        where: {
          phoneNumber: req.body.phone,
        },
      });

      if (userExist) {
        // const otpResponse = await otpManager.sendOTP(phone);
        console.log("OTP send status:", otpResponse);

        return commonHelper.success(
          res,
          Response.success_msg.otpSend,
          otpResponse
        );
      } else {
        console.log("User not found");

        return commonHelper.failed(res, Response.failed_msg.userNotFound);
      }
    } catch (error) {
      console.error("Error while sending the OTP:", error);
      return commonHelper.error(
        res,
        Response.error_msg.otpSendErr,
        error.message
      );
    }
  },

  otpVerify: async (req, res) => {
    try {
      if (req.body.otp == "1111") {
        await Models.userModel.update(
          { otpVerify: 1 },
          { where: { id: req.user.id } }
        );
        return commonHelper.success(res, Response.success_msg.otpVerify);
      } else {
        return commonHelper.failed(res, "Invalid OTP");
      }
    } catch (error) {
      console.error("Error while verifying the OTP:", error);
      return commonHelper.error(
        res,
        Response.error_msg.otpVerErr,
        error.message
      );
    }
  },

  resendOtp: async (req, res) => {
    try {
      const userExist = await Models.userModel.findOne({
        where: {
          email: req.body.email,
        },
      });

      if (userExist) {
        // const otpResponse = await otpManager.sendOTP(phone);

        return commonHelper.success(res, Response.success_msg.otpSend);
      } else {
        console.log("User not found");

        return commonHelper.failed(res, Response.failed_msg.userNotFound);
      }
    } catch (error) {
      console.error("Error while resending the OTP:", error);
      return commonHelper.error(
        res,
        Response.error_msg.otpResErr,
        error.message
      );
    }
  },

  // =========== card grade recognition =============

  uploadAndGrade: async (req, res) => {
    try {
      if (!req.files || !req.files.card) {
         return commonHelper.failed(res,"No card image uploaded.");
      }

      // Save the file using your common helper
      const savedFilePath = await commonHelper.fileUpload(req.files.card);
      const absolutePath = path.join(__dirname, "..", "public", savedFilePath);

      const imageBytes = fs.readFileSync(absolutePath);

      const command = new DetectCustomLabelsCommand({
        ProjectVersionArn: MODEL_ARN,
        Image: { Bytes: imageBytes },
      });

      const detect = await rekognition.send(command);
      console.log("Rekognition output:", detect);

      // Handle NotACard or no labels
      if (
        !detect.CustomLabels ||
        detect.CustomLabels.length === 0 ||
        detect.CustomLabels.some((l) => l.Name === "NotACard")
      ) {
        return commonHelper.failed(res,"❌ Please upload Pokémon cards only.");
      }

      const VALID_GRADES = ["Mint", "Good", "Poor"];
      const MIN_CONFIDENCE = 90;

      const validLabel = detect.CustomLabels.filter(
        (label) =>
          VALID_GRADES.includes(label.Name) &&
          label.Confidence >= MIN_CONFIDENCE
      ).sort((a, b) => b.Confidence - a.Confidence)[0];

      if (!validLabel) {
       return commonHelper.failed(res,"❌ Please upload Pokémon cards only.");
      }

      const grade = validLabel.Name;

      // Feature ranges
      const FEATURE_RANGES = {
        Mint: {
          centering: [9, 10],
          edges: [9, 10],
          surface: [9, 10],
          corners: [9, 10],
        },
        Good: {
          centering: [6, 8],
          edges: [6, 8],
          surface: [6, 8],
          corners: [6, 8],
        },
        Poor: {
          centering: [2, 5],
          edges: [2, 5],
          surface: [2, 5],
          corners: [2, 5],
        },
      };

      function randomInRange([min, max]) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }

      const ranges = FEATURE_RANGES[grade];
      const scores = {
        centering: randomInRange(ranges.centering),
        edges: randomInRange(ranges.edges),
        surface: randomInRange(ranges.surface),
        corners: randomInRange(ranges.corners),
      };

      const overall =
        (scores.centering + scores.edges + scores.surface + scores.corners) / 4;

      const overallDecimal = Math.round(overall * 100) / 100;
      let response={
        grade,
        scores,
        overall: overallDecimal,
        rawLabels: detect.CustomLabels,
        savedPath: savedFilePath,
      }
    return commonHelper.success(res,Response.success_msg.fetchSuccess,response);
    } catch (error) {
      console.error("Error during grading:", error);
       return commonHelper.error(
        res,
        Response.error_msg.otpResErr,
        error.message
      );
    }
  },

  saveImageData: async (req, res) => {
    try {
      const { imagePath, centering, edges, surface, corners, overall } =
        req.body;

      if (!imagePath) {
        return commonHelper.failed(res, "Image path is required");
      }
      const imageData = {
        userId: req.user.id,
        imagePath: imagePath,
        centering: Number(centering),
        edges: Number(edges),
        surface: Number(surface),
        corners: Number(corners),
        overall: Number(overall),
      };
      const savedData = await Models.userCardsModel.create(imageData);
      return commonHelper.success(
        res,
        "Image data saved successfully",
        savedData
      );
    } catch (error) {
      console.error("Error while saving image data:", error);
      return commonHelper.error(
        res,
        Response.error_msg.svImgErr,
        error.message
      );
    }
  },

  usersCards: async (req, res) => {
    try {
      const userId = req.user.id;
      const cards = await Models.userCardsModel.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
        raw: true,
      });
      return commonHelper.success(
        res,
        "User cards fetched successfully",
        cards
      );
    } catch (error) {
      console.error("Error while fetching user cards:", error);
      return commonHelper.error(
        res,
        "Error while fetching user cards",
        error.message
      );
    }
  },

  cardDetails: async (req, res) => {
    try {
      const cardId = req.body.cardId;
      const card = await Models.userCardsModel.findOne({
        where: { id: cardId },
        raw: true,
      });
      if (!card) {
        return commonHelper.failed(res, "Card not found");
      }
      return commonHelper.success(
        res,
        "Card details fetched successfully",
        card
      );
    } catch (error) {
      console.error("Error while fetching card details:", error);
      return commonHelper.error(
        res,
        "Error while fetching card details",
        error.message
      );
    }
  },
};

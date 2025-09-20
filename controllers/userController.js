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
    let user= await Models.userModel.findOne({
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

      const {email, newPassword } = payload;
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
        { where: { email: req.user.email} }
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
      const { phone } = req.body; //"+911010101010"; // Replace with dynamic input
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
      console.error("Error while resending the OTP:", error);
      return commonHelper.error(
        res,
        Response.error_msg.otpResErr,
        error.message
      );
    }
  },
};

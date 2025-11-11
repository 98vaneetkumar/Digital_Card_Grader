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
const stripe = require("stripe")(process.env.STRIPE_SK_KEY);
const commonHelper = require("../helpers/commonHelper.js");
const helper = require("../helpers/validation.js");
const Models = require("../models/index");
const Response = require("../config/responses.js");
const { gradeCard } = require("../utils/grading.js");
const { loadPokemonCSV } = require("../utils/csvLoader.js");
const fs = require("fs");
const path = require("path");

const {
  RekognitionClient,
  DetectCustomLabelsCommand,
} = require("@aws-sdk/client-rekognition");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuid } = require("uuid");

const s3 = new S3Client({ region: process.env.AWS_REGION });

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const MODEL_ARN = process.env.MODEL_ARN;


Models.userMarketPlaceModel.belongsTo(Models.userCardsModel, { foreignKey: 'cardId' });
Models.userCollectionModel.belongsTo(Models.userModel,{foreignKey:'userId'})
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
   const customer = await stripe.customers.create({
        description: "Digital Card",
        email: req.body.email,
      });
      let customerId = customer.id;
      let objToSave = {
        name: payload.name,
        lastName: payload.lastName,
        email: payload.email,
        role: 1,
        status: 1,
        password: hashedPassword,
        deviceToken: payload.deviceToken,
        deviceType: payload.deviceType,
        customerId:customerId
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
      
      if (user && user.customerId == null) {
        const hashedPassword = await commonHelper.bcryptData(
          payload.password,
          process.env.SALT
        );
        let customer = await stripe.customers.create({
          description: "Digital Card",
          email: req.body.email,
        });
        var customerId = customer.id;
      }
      await Models.userModel.update(
        {
          deviceToken: payload.deviceToken,
          deviceType: payload.deviceType,
          verifyStatus: 0,
          customerId:user.customerId?user.customerId:customerId
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
  deleteAccount: async (req, res) => {
    try {
      await Models.userModel.destroy({
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
  contactUs: async (req, res) => {
    try {
      let objToSave = {
        name: req.body.name,
        email: req.body.email,
        description: req.body.description,
      };
      await Models.contactUsModel.create(objToSave);

      return commonHelper.success(res, Response.success_msg.contactUs);
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
        name: Joi.string().optional(),
        bio: Joi.string().optional(),
      });

      let payload = await helper.validationJoi(req.body, schema);

      if (!req.user || !req.user.id) {
        return commonHelper.failed(res, Response.failed_msg.userIdReq);
      }
      if (req.files && req.files.image) {
        const file = req.files.image;
        const savedRelativePath = await commonHelper.fileUpload(file, "images");
        payload.profilePicture = savedRelativePath;
      }
      let updateProfile = {
        name: payload.name,
        bio: payload.bio,
        profilePicture: payload.profilePicture
          ? payload.profilePicture
          : req.user.profilePicture,
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
        return commonHelper.failed(res, "No card image uploaded.", 400);
      }

      const file = req.files.card;

      // 1️⃣ SAVE FILE LOCALLY
      const savedRelativePath = await commonHelper.fileUpload(file, "images");
      if (!savedRelativePath) {
        return commonHelper.failed(res, "Failed to save uploaded card.", 500);
      }

      const savedAbsolutePath = path.join(
        __dirname,
        "..",
        "public",
        savedRelativePath
      );

      // 2️⃣ LOAD CSV DATA
      const csvPath = path.join(__dirname, "..", "data", "all_cards.csv");
      const pokemonData = await loadPokemonCSV(csvPath);

      // 3️⃣ GRADE CARD
      const grading = await gradeCard(savedAbsolutePath, pokemonData);

      // 4️⃣ VALIDATION RESPONSE
      if (!grading.success) {
        let message = "Card not recognized.";
        if (grading.reason === "low_confidence") message = "Try clearer image.";
        if (grading.reason === "no_borders")
          message = "Card not visually detected.";
        if (grading.reason === "bad_aspect_ratio")
          message = "Image not card-like.";

        console.log("🚫 Grading failed reason:", grading.reason);
        return commonHelper.failed(res, message, 400);
      }

      // 5️⃣ SUCCESS RESPONSE
      const response = {
        scores: {
          centering: parseFloat(grading.centering),
          edges: parseFloat(grading.edges),
          surface: parseFloat(grading.surface),
          corners: parseFloat(grading.corners),
          overall: parseFloat(grading.overall),
        },
        pokemon: grading.pokemon,
        savedPath: savedRelativePath,
      };

      return commonHelper.success(
        res,
        Response.success_msg.fetchSuccess,
        response
      );
    } catch (error) {
      console.error("Error during grading:", error);
      return commonHelper.error(
        res,
        Response.error_msg.uplImgErr,
        error.message
      );
    }
  },

  saveImageData: async (req, res) => {
    try {
      const {
        cardName,
        cardType,
        additionalNotes,
        imagePath,
        centering,
        edges,
        surface,
        corners,
        overall,
        collectionId,
      } = req.body;

      if (!imagePath) {
        return commonHelper.failed(res, "Image path is required");
      }
      const imageData = {
        userId: req.user.id,
        cardName: cardName || null,
        cardType: cardType || 0,
        additionalNotes: additionalNotes || null,
        imagePath: imagePath,
        centering: Number(centering),
        edges: Number(edges),
        surface: Number(surface),
        corners: Number(corners),
        overall: Number(overall),
        collectionId: req.body&&req.body.collectionId || null,
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

  addCollection: async (req, res) => {
    try {
      if (req.files && req.files.image) {
        const file = req.files.image;
        const savedRelativePath = await commonHelper.fileUpload(file, "images");
        req.body.imagePath = savedRelativePath;
      }
      let objToSave = {
        imagePath: req.body.imagePath,
        cardName: req.body.cardName,
        userId: req.user.id,
      };
      await Models.userCollectionModel.create(objToSave);
      return commonHelper.success(res, "User cart collection add successfully");
    } catch (error) {
      console.error("Error while fetching user cards:", error);
      return commonHelper.error(
        res,
        "Error while fetching user cards",
        error.message
      );
    }
  },

  collectionList: async (req, res) => {
    try {
      let result = await Models.userCollectionModel.findAll({
        where: {
          userId: req.user.id,
        },
        include:[{
          model:Models.userModel
        }]
      });
      return commonHelper.success(
        res,
        "User collection cards fetched successfully",
        result
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
  addToMarketPlace: async (req, res) => {
    try {
      let objToSave = {
        userId: req.user.id,
        cardId: req.body.cardId,
        price: req.body.price,
        additionalNotes: req.body.additionalNotes,
      };
      await Models.userMarketPlaceModel.create(objToSave);
      return commonHelper.success(
        res,
        "Card added to market place successfully"
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
  marketPlaceList: async (req, res) => {
    try {
      let response = await Models.userMarketPlaceModel.findAll({
        where: {
          userId: req.user.id,
        },
        include: [
          {
            model: Models.userCardsModel,
          },
        ],
      });
      return commonHelper.success(
        res,
        "Market place cards fetched successfully",
        response
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
  cardList: async (req, res) => {
    try {
      let response = await Models.userCardsModel.findAll({
        where: {
          colectionId: {
            [Op.ne]: null,
          },
        },
      });
      return commonHelper.success(res, "Cards fetched successfully", response);
    } catch (error) {
      console.error("Error while fetching user cards:", error);
      return commonHelper.error(
        res,
        "Error while fetching user cards",
        error.message
      );
    }
  },
  home: async (req, res) => {
    try {
      let cardWhere = {}; // condition for userCards
      // 🔍 Apply search filter
      if (req.query && req.query.search) {
        const search = req.query.search.trim();
        // Also search in related userCards by cardName
        cardWhere = {
          cardName: { [Op.like]: `%${search}%` },
        };
      }

      // 🧩 Fetch data with association + search filters
      const response = await Models.userMarketPlaceModel.findAll({
        include: [
          {
            model: Models.userCardsModel,
            where: cardWhere, // Search inside userCards table
            required: true, // ensures only records that match are fetched
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return commonHelper.success(
        res,
        "Market place cards fetched successfully",
        response
      );
    } catch (error) {
      console.error("Error while fetching marketplace cards:", error);
      return commonHelper.error(
        res,
        "Error while fetching marketplace cards",
        error.message
      );
    }
  },
  getProfile:async(req,res)=>{
    try {
      let response = await Models.userModel.findOne({
        where: {
          id: req.user.id,
        },
        raw:true
      });
      return commonHelper.success(
        res,
        "User profile fetched successfully",
        response
      );
    } catch (error) {
      console.error("Error while fetching user profile:", error);
      return commonHelper.error(
        res,
        "Error while fetching user profile",
        error.message
      );
    }
  },
    paymentIntent: async (req, res) => {
    try {
      let userDetail = await Models.userModel.findOne({
        where: { id: req.user.id },
        raw: true,
      });
      const ephemeralKey = await stripe.ephemeralKeys.create(
        { customer: userDetail.customerId },
        { apiVersion: "2022-11-15" }
      );
      const amount = parseFloat((req.body.amount * 100).toFixed(2));

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "USD",
        customer: userDetail.customerId,
        // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
        automatic_payment_methods: {
          enabled: true,
        },
      });
      let result = {
        paymentIntent: paymentIntent,
        ephemeralKey: ephemeralKey.secret,
        customer: userDetail.customerId,
        publishableKey: process.env.STRIPE_PK_KEY,
        transactionId: paymentIntent.id,
      };
      let adminId = await Models.userModel.findOne({
        where: {
          role: 0,
        },
        raw: true,
      });
      let objToSave = {
        senderId: req.user.id,
        receiverId: adminId.id,
        amount: req.body.amount,
        transactionId: paymentIntent.id,
      };
      await Models.transactionModel.create(objToSave);
      return commonHelper.success(
        res,
        Response.success_msg.paymentIntent,
        result
      );
    } catch (error) {
      console.log("error", error);
      return commonHelper.error(
        res,
        Response.error_msg.internalServerError,
        error.message
      );
    }
  },
  webHookFrontEnd: async (req, res) => {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        req.body.transactionId
      );
      await Models.transactionModel.update(
        {
          payment_status:
            paymentIntent.status === "succeeded"
              ? "succeeded"
              : paymentIntent.status,
        },
        {
          where: {
            transactionId: req.body.transactionId,
          },
        }
      );
      return commonHelper.success(
        res,
        Response.success_msg.stripeWebHookFrontEnd
      );
    } catch (error) {
      console.log("error", error);
      return commonHelper.error(
        res,
        Response.error_msg.internalServerError,
        error.message
      );
    }
  },
};

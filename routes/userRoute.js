var express = require('express');
var router = express.Router();
const controller = require('../controllers/index');
const {authentication,forgotPasswordVerify} = require('../middlewares/authentication');


module.exports=function(){
    router.post('/signUp', controller.userController.signUp);
    router.post('/login', controller.userController.login);
    router.post('/logout', authentication, controller.userController.logout);
    router.post('/deleteAccount', authentication, controller.userController.deleteAccount);
    router.post("/contactUs", controller.userController.contactUs);
    router.patch('/updateProfile', authentication, controller.userController.updateProfile);
    router.post('/forgotPassword', controller.userController.forgotPassword);
    router.get('/resetPassword', forgotPasswordVerify, controller.userController.resetPassword);
    router.post('/forgotChangePassword', controller.userController.forgotChangePassword);
    router.post("/forgetPasswordOTPVerify", controller.userController.forgetPasswordOTPVerify);
    router.post("/setNewPassword", controller.userController.setNewPassword);
    router.post('/changePassword', authentication, controller.userController.changePassword);
    // router.get('/sidIdGenerate', controller.userController.sidIdGenerate);
    router.post('/otpSend', controller.userController.otpSend);
    router.post('/otpVerify', authentication, controller.userController.otpVerify);
    router.post('/resendOtp', controller.userController.resendOtp);

    router.post('/uploadAndGrade', authentication, controller.userController.uploadAndGrade);
    router.post('/saveImageData', authentication, controller.userController.saveImageData);
    router.get('/usersCards', authentication, controller.userController.usersCards);
    router.post('/cardDetails', authentication, controller.userController.cardDetails);

    router.post("/addCollection",authentication,controller.userController.addCollection)
    router.get("/collectionList",authentication,controller.userController.collectionList)

    router.post("/addToMarketPlace",authentication,controller.userController.addToMarketPlace)
    router.get("/marketPlaceList",authentication,controller.userController.marketPlaceList)
    router.get("/cardList",authentication,controller.userController.cardList)
    router.get("/home",authentication,controller.userController.home)
    router.get("/getProfile",authentication,controller.userController.getProfile)
    return router
}


var express = require('express');
var router = express.Router();
const controller = require('../controllers/index');
const {authentication,forgotPasswordVerify} = require('../middlewares/authentication');


module.exports=function(){
    router.post('/signUp', controller.userController.signUp);
    router.post('/login', controller.userController.login);
    router.post('/logout', authentication, controller.userController.logout);
    router.patch('/updateProfile', authentication, controller.userController.updateProfile);
    router.post('/forgotPassword', controller.userController.forgotPassword);
    router.get('/resetPassword', forgotPasswordVerify, controller.userController.resetPassword);
    router.post('/forgotChangePassword', controller.userController.forgotChangePassword);
    router.post('/changePassword', authentication, controller.userController.changePassword);
    router.get('/sidIdGenerate', controller.userController.sidIdGenerate);
    router.post('/otpSend', controller.userController.otpSend);
    router.post('/otpVerify', authentication, controller.userController.otpVerify);
    router.post('/resendOtp', controller.userController.resendOtp);

    return router
}


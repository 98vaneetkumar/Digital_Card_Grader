var express = require("express");
var router = express.Router();
const controller = require("../controllers/index");
const { session } = require("../helpers/commonHelper.js");

module.exports = function () {
  router.get("/", controller.adminController.login_page);
  router.get("/login", controller.adminController.login_page);
  router.post("/Login", controller.adminController.login);
  router.post("/logout", controller.adminController.logout);
  router.get("/dashboard", session, controller.adminController.dashboard);
  router.get('/getDashboardData', session, controller.adminController.getDashboardData);


  router.get("/profile", controller.adminController.profile);
  router.post("/profile_update/:id", controller.adminController.profile_update);
  router.get("/csvList", controller.adminController.csvList);
  router.get("/csvUpload", controller.adminController.csvUpload);
  router.post("/csvDataUpload", controller.adminController.csvDataUpload);
  router.post("/viewCsv", controller.adminController.viewCsv);
  router.post("/deleteCsv", controller.adminController.deleteCsv);

  router.get("/change_password", controller.adminController.change_password);
  router.post(
    "/change_password_post",
    controller.adminController.change_password_post
  );
  router.get("/aboutUs", session, controller.adminController.aboutUs);
  router.post("/about_post", session, controller.adminController.about_post);

  router.get(
    "/privacyPolicy",
    session,
    controller.adminController.privacyPolicy
  );
  router.post(
    "/privacy_post",
    session,
    controller.adminController.privacy_post
  );

  router.get(
    "/termsConditions",
    session,
    controller.adminController.termsConditions
  );

  router.post(
    "/termsConditionsPost",
    session,
    controller.adminController.termsConditionsPost
  );

  router.get(
    "/users_listing",
    session,
    controller.adminController.users_listing
  );
  router.get("/user_view/:id", session, controller.adminController.user_view);
  router.post("/user_status", session, controller.adminController.user_status);
  router.post("/user_delete", session, controller.adminController.user_delete);

  router.get('/faq_list', session, controller.adminController.faq_list)
  router.get('/add_faq', session, controller.adminController.add_faq)
  router.post('/create_faq', session, controller.adminController.create_faq)
  router.post('/delete_faq', session, controller.adminController.delete_faq)
  router.get("/faq_edit/:id",session, controller.adminController.faq_edit);
  router.post("/faq_update/:id", session, controller.adminController.faq_update);
  router.get("/faq_view/:id",session, controller.adminController.faq_view);
  
  return router;
};


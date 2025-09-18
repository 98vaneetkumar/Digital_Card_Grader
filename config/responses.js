var success_msg = {
  registered: "User registered successfully",

  login: "Login successful",

  passwordLink: "Password reset link has been sent to your email",

  passwordChange: "Password changed successfully",

  logout: "User logged out successfully!",

  updateProfile: "User profile updated successfully!",

  passwordUpdate: "Password updated successfully.",

  otpSend: "OTP sent successfully",

  otpVerify: "Otp verified successfully",

  otpResend: "OTP resent successfully",
};

var failed_msg = {
  userNotFound: "User not found",

  invalidPassword: "Invalid password",

  noAccWEmail: "No account exists with this email",

  pwdNoMatch: "Passwords do not match!",

  userIdReq: "User ID is required.",

  incorrectCurrPwd: "Incorrect current password.",

  tokReq: "Token is required!",

  invTok: "Invalid token!",
};

var error_msg = {
  regUser: "Error registering user",

  loguser: "Error during login",

  forgPwdErr: "Forgot password error",

  resetPwdErr: "Reset password error",

  chngPwdErr: "Error while changing the password",

  logoutErr: "Logout error",

  updPrfErr: "Error while updating profile",

  tokenNotPrv: "Token is not provided!",

  forPwdTokVer: "Forgot password token verification error!",

  pwdResTokExp: "Password reset token is invalid or has expired",

  otpSendErr: "Error while sending the otp",

  otpVerErr: "Error while verifying the otp",

  otpResErr: "Failed to resend OTP",
};

module.exports = {
  success_msg: success_msg,
  failed_msg: failed_msg,
  error_msg: error_msg,
};

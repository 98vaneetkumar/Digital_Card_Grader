exports.forgotPassword = function (resetUrl) {
  return `
      <div style="background-image: url('https://www.wallpapertip.com/wmimgs/81-817983_aesthetic-landscape-hd-wallpapers-1080p-4k-36512-aesthetic.jpg'); background-size: cover; padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h2>Password Reset Request</h2>
        <p style="font-size: 18px; color: #333;">You requested a password reset. Please click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; margin: 20px 0; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p style="font-size: 14px; color: #777;">This link is valid for 1 hour.</p>
        <p style="font-size: 14px; color: #777;">If you didn't request this, please ignore this email.</p>
      </div>
    `;
};

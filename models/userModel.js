module.exports = (Sequelize, sequelize, DataTypes) => {
  return sequelize.define(
    "users",
    {
      ...require("./cors")(Sequelize, DataTypes),
      role: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1, // 0 for admin, 1 for user
      },
      customerId:{
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null  ,
      },
      packType:{
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: null  ,//0-> bronze,1-> silver,2-> gold
      },
      myCredits:{
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      }, 
      hasLimited :{
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      packUsed :{
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      profilePicture: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      resetToken: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      resetTokenExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      deviceToken: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      deviceType: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      bio: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      otpVerify: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      socketId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: "",
      },
      isOnline: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0, // 0 means offline 1 for online
      },
    },
    {
      timestamps: true,
      tableName: "users",
    }
  );
};

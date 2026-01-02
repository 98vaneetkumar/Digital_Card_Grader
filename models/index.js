const Sequelize = require("sequelize");
const sequelize = require("../dbConnection").sequelize;

module.exports = {
  userModel: require("./userModel")(Sequelize, sequelize, Sequelize.DataTypes),
  userCollectionModel:require("./userCollectionModel")(Sequelize, sequelize, Sequelize.DataTypes),
  userCardsModel: require("./userCardsModel")(Sequelize, sequelize, Sequelize.DataTypes),
  userMarketPlaceModel: require("./userMarketPlaceModel")(Sequelize, sequelize, Sequelize.DataTypes),
  cmsModel: require("./cmsModel")(Sequelize, sequelize, Sequelize.DataTypes),
  faqModel: require("./faqModel")(Sequelize, sequelize, Sequelize.DataTypes),
  chatConstantModel:require("./chatConstantModel")(Sequelize, sequelize, Sequelize.DataTypes),
  messageModel:require("./messageModel")(Sequelize, sequelize, Sequelize.DataTypes),
  fileBackupsModel: require("./fileBackups")(Sequelize, sequelize, Sequelize.DataTypes),
  contactUsModel: require("./contactUsModel")(Sequelize, sequelize, Sequelize.DataTypes),
  transactionsModel: require("./transactionModel")(Sequelize, sequelize, Sequelize.DataTypes),
  followingModel: require("./followingModel")(Sequelize, sequelize, Sequelize.DataTypes),
  packBuyUser: require("./packBuyUser")(Sequelize, sequelize, Sequelize.DataTypes),
};

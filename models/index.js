const Sequelize = require("sequelize");
const sequelize = require("../dbConnection").sequelize;

module.exports = {
  userModel: require("./userModel")(Sequelize, sequelize, Sequelize.DataTypes),
  userCardsModel: require("./userCardsModel")(Sequelize, sequelize, Sequelize.DataTypes),
};

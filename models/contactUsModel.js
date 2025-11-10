module.exports = (Sequelize, sequelize, DataTypes) => {
    return sequelize.define(
      "contactUs",
      {
        ...require("./cors")(Sequelize, DataTypes),
        name: {
          type: DataTypes.STRING(255),
          allowNull: true,
          defaultValue: "",
        },
        description: {
          type: DataTypes.TEXT('long'),
          allowNull: true,
          defaultValue: null,
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: true,
          defaultValue: null,  
        },
      },
      {
        timestamps: true,
        tableName: "contactUs",
      }
    );
  };
  
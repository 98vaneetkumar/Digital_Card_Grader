module.exports = (Sequelize, sequelize, DataTypes) => {
    return sequelize.define(
      "cms",
      {
        ...require("./cors")(Sequelize, DataTypes),
        title: {
          type: DataTypes.STRING(255),
          allowNull: true,
          defaultValue: "",
        },
        description: {
          type: DataTypes.TEXT('long'),
          allowNull: true,
          defaultValue: null,
        },
        type: {
          type: DataTypes.INTEGER(11),
          allowNull: true,
          defaultValue: 0,  //1 for about us 2 for privacy policy 3 for terms and conditions
        },
      },
      {
        timestamps: true,
        tableName: "cms",
      }
    );
  };
  
module.exports = (Sequelize, sequelize, DataTypes) => {
    return sequelize.define(
      "faq",
      {
        ...require("./cors")(Sequelize, DataTypes),
        question: {
          type: DataTypes.STRING(255),
          allowNull: true,
          defaultValue: "",
        },
        answer: {
          type: DataTypes.TEXT,
          allowNull: true,
          defaultValue: "",
        },
      },
      {
        timestamps: true,
        tableName: "faq",
      }
    );
  };
  
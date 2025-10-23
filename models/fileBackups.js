module.exports = (Sequelize, sequelize, DataTypes) => {
  return sequelize.define(
    "fileBackups",
    {
      ...require("./cors")(Sequelize, DataTypes),

      filename: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      fileType: {
        type: DataTypes.ENUM("csv", "json"),
        allowNull: false,
      },

      content: {
        type: DataTypes.TEXT("long"), // for large CSV/JSON content
        allowNull: false,
      },

      uploadedBy: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      uploadedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    },
    {
      timestamps: true,
      tableName: "fileBackups",
    }
  );
};

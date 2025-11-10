module.exports = (Sequelize, sequelize, DataTypes) => {
  return sequelize.define(
    "userMarketPlace",
    {
      ...require("./cors")(Sequelize, DataTypes),
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    cardId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "userCards",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      price: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      additionalNotes: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      timestamps: true,
      tableName: "userMarketPlace",
    }
  );
};

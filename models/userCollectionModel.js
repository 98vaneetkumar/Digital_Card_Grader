module.exports = (Sequelize, sequelize, DataTypes) => {
  return sequelize.define(
    "userCollection",
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
      cardName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      imagePath: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      cardType: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0, // 0 FOR COLLECTION 1 FOR MARKET PLACE
      },
    },
    {
      timestamps: true,
      tableName: "userCollection",
    }
  );
};

module.exports = (Sequelize, sequelize, DataTypes) => {
  return sequelize.define(
    "userCards",
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
      cardType: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0, // 0: pokemon card, 1: sports card
      },
      additionalNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      imagePath: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      centering: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: 0.0,
      },
      edges: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: 0.0,
      },
      surface: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: 0.0,
      },
      corners: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: 0.0,
      },
      overall: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: 0.0,
      },
    },
    {
      timestamps: true,
      tableName: "userCards",
    }
  );
};

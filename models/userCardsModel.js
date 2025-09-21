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

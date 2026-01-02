module.exports = (Sequelize, sequelize, DataTypes) => {
  return sequelize.define(
    "packBuyUser",
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
     packType:{
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: null  ,//0-> bronze,1-> silver,2-> gold
      },
      packUsed :{
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      timestamps: true,
      tableName: "packBuyUser",
    }
  );
};

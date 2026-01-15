module.exports = (Sequelize, sequelize, DataTypes) => {
    return sequelize.define(
      "inventory",
      {
        ...require("./cors")(Sequelize, DataTypes),
        userId:{
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: "users", // name of Target model
                key: "id", // key in Target model that we"re referencing
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        name:{
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        isUsed:{
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        }
   
      },
      {
        timestamps: true,
        tableName: "inventory",
      }
    );
  };
  
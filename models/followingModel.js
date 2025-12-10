module.exports = (Sequelize, sequelize, DataTypes) => {
    return sequelize.define(
      "follow",
      {
        ...require("./cors")(Sequelize, DataTypes),
        followerId :{  //who do follow
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: "users", // name of Target model
                key: "id", // key in Target model that we"re referencing
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        followingId :{ //who is following
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: "users", // name of Target model
                key: "id", // key in Target model that we"re referencing
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        isAccept:{
          type: DataTypes.INTEGER,
          defaultValue: 0  // 0 for pending 1 for accept
        }
      },
      {
        timestamps: true,
        tableName: "follow",
      }
    );
  };
  
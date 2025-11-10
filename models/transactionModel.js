module.exports = (Sequelize, sequelize, DataTypes) => {
    return sequelize.define(
      "transactions",
      {
        ...require("./cors")(Sequelize, DataTypes),
        senderId:{
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: "users", // name of Target model
                key: "id", // key in Target model that we"re referencing
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        receiverId:{
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: "users", // name of Target model
                key: "id", // key in Target model that we"re referencing
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        amount: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: "",
        },
        transactionId:{
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: "",
        },
        payment_status:{
            type:DataTypes.STRING(255),
            allowNull:true,
            defaultValue:""
        }
  
      },
      {
        timestamps: true,
        tableName: "transactions",
      }
    );
  };
  
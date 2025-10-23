module.exports = (Sequelize, sequelize, DataTypes) => {
    return sequelize.define(
      "message",
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
        // chatConstantId:{
        //     type: Sequelize.UUID,
        //     allowNull: true,
        //     references: {
        //         model: "chatConstant", // name of Target model
        //         key: "id", // key in Target model that we"re referencing
        //     },
        //     onUpdate: "CASCADE",
        //     onDelete: "CASCADE",
        // },
        deletedId:{
            type: Sequelize.UUID,
            allowNull: true,
            defaultValue:null,
            references: {
                model: "users", // name of Target model
                key: "id", // key in Target model that we"re referencing
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE", 
        },
       message:{
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: "",
        },
        messageType:{
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },
        thumbnail: {
			type: DataTypes.TEXT,
			allowNull: false,
			defaultValue: null,
		},
        readStatus:{
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },
      },
      {
        timestamps: true,
        tableName: "message",
      }
    );
  };
  
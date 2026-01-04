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
      collectionId: {
        type: Sequelize.UUID,
        allowNull: true,
        defaultValue: null,
        references: {
          model: "userCollection",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      hasLimited:{
        type:DataTypes.INTEGER,
        allowNull:true,
        defaultValue:0 //0: no, 1: yes
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
      backImagePath: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      backCentering: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: 0.0,
      },
      backEdges: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: 0.0,
      },
      backSurface: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: 0.0,
      },
      backCorners: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: 0.0,
      },
      backOverall: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: 0.0,
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

const Sequelize = require("sequelize");
const sequelize = new Sequelize(
  process.env.DATABASE_NAME,
  process.env.DATABASE_USER,
  process.env.DATABASE_PASSWORD,
  {
    host: process.env.DATABASE_HOST,
    dialect: process.env.DIALECT,
  }
);

const connectdb = async () => {
  await sequelize
    .authenticate() 
    .then(async () => {
      // await sequelize.sync({ alter: true });
      console.log("db is connected and sync also"); 
    })  
    .catch((err) => {
      console.log("error while connecting to the db", err);
      throw err; 
    });
}; 

module.exports = {
  sequelize: sequelize,
  connectdb: connectdb,
};

const numCPUs = require("os").cpus().length;

const Sequelize = require("sequelize");
const sequelize = new Sequelize(
  process.env.DATABASE_NAME,
  process.env.DATABASE_USER,
  process.env.DATABASE_PASSWORD,
  {
    host: process.env.DATABASE_HOST,
    dialect: process.env.DIALECT,
    logging: false, // Optional: disable SQL logging in console

    // Connection pool settings
    pool: {
      max: numCPUs,      // maximum number of connection in pool
      min: 0,          // minimum number of connection in pool
      acquire: 30000,  // max time (ms) that pool will try to get connection before throwing error
      idle: 10000      // max time (ms) that a connection can be idle before being released
    }
  }
);

const connectdb = async () => {
  await sequelize
    .authenticate()
    .then(async () => {
      await sequelize.sync({ alter: false });
      // console.log("db is connected and sync also");
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

require('dotenv').config();
const path = require('path');

function parseMysqlUrl(url) {
  if (!url) return null;
  const pattern = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(pattern);
  if (!match) return null;
  return {
    host: match[3],
    port: parseInt(match[4], 10),
    user: match[1],
    password: match[2],
    database: match[5],
  };
}

const mysqlUrlConfig = parseMysqlUrl(process.env.MYSQL_URL);

const mysqlDefaults = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'db_timepro',
};

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  dataPath: process.env.DATA_PATH || path.join(__dirname, '..', 'data', 'tasks.json'),
  mysql: mysqlUrlConfig || {
    host: process.env.MYSQL_HOST || mysqlDefaults.host,
    port: parseInt(process.env.MYSQL_PORT, 10) || mysqlDefaults.port,
    user: process.env.MYSQL_USER || mysqlDefaults.user,
    password: process.env.MYSQL_PASSWORD || mysqlDefaults.password,
    database: process.env.MYSQL_DATABASE || mysqlDefaults.database,
  },
};

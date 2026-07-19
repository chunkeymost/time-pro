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

module.exports = {
  port: process.env.PORT || 3000,
  dataPath: process.env.DATA_PATH || path.join(__dirname, '..', 'data', 'tasks.json'),
  mysql: mysqlUrlConfig || {
    host: process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || process.env.MYSQLPORT || '8889', 10),
    user: process.env.MYSQL_USER || process.env.MYSQLUSER || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || 'root',
    database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'db_timepro',
  },
};

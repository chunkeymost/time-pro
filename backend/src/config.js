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
  port: 3030,
  dataPath: path.join(__dirname, '..', 'data', 'tasks.json'),
  mysql: {
    host: 'localhost',
    port: 8889,
    user: 'root',
    password: 'root',
    database: 'db_timepro',
  },
};

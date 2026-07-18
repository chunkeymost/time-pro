const path = require('path');

module.exports = {
  port: 3000,
  dataPath: path.join(__dirname, '..', 'data', 'tasks.json'),
  mysql: {
    host: 'localhost',
    port: 8889,
    user: 'root',
    password: 'root',
    database: 'time_pro',
  },
};

const mysql = require('mysql');

const pool = mysql.createPool({
    connectionLimit: 10, // Adjust according to your needs
    host: 'urlshortnerdb.cni2ewgyq36q.us-east-1.rds.amazonaws.com',
    user: 'admin',
    password: '!Naruto2023',
    database: 'linkshortner',
    port: 3306
  });
  
module.exports = pool;

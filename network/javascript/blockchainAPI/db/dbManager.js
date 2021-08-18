const mysql = require('mysql');


class Database {

    constructor() {

        // Development
        this.connection = mysql.createConnection({
            host: "3.126.153.185",
            user: "aipan",
            password: "Xy9i7n8!",
            database: "aipan"
        });
    }

    query(sql, args) {
        return new Promise((resolve, reject) => {
            this.connection.query(sql, args, (err, rows) => {
                if (err)
                    return reject(err);
                resolve(rows);
            });
        });
    }
}

module.exports = Database;

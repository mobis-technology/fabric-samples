const Database = require('./../db/dbManager');
const database = new Database();
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware for checking user roles for accessing the route
 *
 */
module.exports = function authorize() {

    return function (req, res, next) {

        const bearerHeader = req.headers["authorization"];

        if (typeof bearerHeader !== 'undefined') {

            const bearer = bearerHeader.split(' ');
            const token = bearer[1];

            jwt.verify(token, config.secret, (err, decoded) => {
                if (err)
                    return res.status(401).send({status: false, msg: 'Failed to authenticate token.'});

                // if everything good, save to request for use in other routes
                req.userId = decoded.id;

                const query = "SELECT c.name as organization, u.username, u.role, u.company_id FROM users as u, companies as c where u.id = ? and company_id = c.id";
                database.query(query, [decoded.id]).then(rows => {
                    req.userName = rows[0].username;
                    req.organization = rows[0].organization;
                    req.userRole = rows[0].role;
                    req.company_id = rows[0].company_id;
                    next();
                }, err => {
                    // AFTER CLOSING THE SERVER NEEDS TO BE RESTARTED
                    // return database.close().then(() => {
                    throw err;
                    // })
                }).catch(err => {
                    // handle the error
                    res.status(500);
                    res.send(res.send({status: false, prompt: 'ERROR: ' + err}));
                });
            });
        } else {
            return res.status(403).send({
                message: "No token provided!"
            });
        }

    }

};

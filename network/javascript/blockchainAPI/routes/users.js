const express = require('express');
const router = express.Router();

const Database = require('./../db/dbManager');
const database = new Database();

var bcrypt = require('bcryptjs');
const config = require('./../config');
var bodyParser = require('body-parser');
router.use(bodyParser.json());
var jwt = config.jwt;

const {v4: uuidv4} = require('uuid');
const moment = require('moment');

const authorize = require('../middlewares/checkPermissions');

/************************************************************************************************
 *
 * Sensors related
 *
 ************************************************************************************************/

/**
 * FILTER BY
 */
router.get("/filterBy", function (req, res) {
    let how_many = +req.query.how_many || 25
    let offset = +req.query.offset || 0

    const params = [];
    name = req.query.name || 'all'
    role = req.query.role || 'all'
    username = req.query.username || 'all'
    email = req.query.email || 'all'

    let select_sql = 'SELECT c.name as company, u.id, u.name, u.username, u.email, u.role FROM users as u, companies as c WHERE u.company_id = c.id AND 1 = 1';

    if (name !== 'all') {
        select_sql += " AND name LIKE ?";
        params.push('%' + name + '%');
    }
    if (role !== 'all') {
        select_sql += " AND role = ?";
        params.push(role);
    }
    if (username !== 'all') {
        select_sql += " AND username LIKE ?";
        params.push('%' + username + '%');
    }
    if (email !== 'all') {
        select_sql += " AND email LIKE ?";
        params.push('%' + email + '%');
    }

    params.push(how_many)
    params.push(offset)

    database.query(select_sql + " LIMIT ? OFFSET ? ", params).then(rows => {
        database.query(select_sql, params).then(rows1 => {
            res.send({status: true, data: rows, all: rows1.length})
        }, err => {
            throw err;
        })
    }, err => {
        throw err;
    }).catch(err => {
        // handle the error
        console.log('Failed to query.' + err);
        res.status(500);
        res.send({status: false, msg: 'Error ' + err});
    });
})

/**
 * Get users
 */
router.get('/', authorize(), (req, res, next) => {

    const query = "SELECT c.name as company, u.id, u.name, u.username, u.email, u.role FROM users as u, companies as c WHERE company_id = c.id";

    database.query(query).then(rows => {
        res.send({status: true, data: rows});
        // return database.close();
    }, err => {
        // AFTER CLOSING THE SERVER NEEDS TO BE RESTARTED
        // return database.close().then(() => {
        throw err;
        // })
    }).catch(err => {
        // handle the error
        console.log('Failed to query.' + err);
        res.sendStatus(500);
        res.end();
    });

});

/**
 * Route for retrieving user
 * checkPermissions([1,2,3,4])
 */
router.get("/getUser/:id", authorize(),function (req, res) {
    if (!req.params.id) {
        res.status(400).send({status: false, msg: "Route param id of user is required."})
    } else {
        database.query("SELECT id, name, username, role, email, company_id FROM users WHERE id = ?", [req.params.id]).then(rows => {
            if (rows.length > 0) {
                let user = rows[0]
                res.send({status: true, data: user})
            } else {
                res.status(404).send({status: false, msg: "User with id does not exists."})
            }
        }, err => {
            throw err;
        }).catch(err => {
            // handle the error
            console.log('Failed to query.' + err);
            res.status(500);
            res.send({status: false, msg: 'Error ' + err});
        });
    }
})

/**
 * Add user
 */
router.post('/add', authorize(), (req, res) => {

    if (!req.body.username || !req.body.password || !req.body.name) {
        res.status(400);
        res.send({status: false, msg: 'Parameters username, password and name are required !'});
    } else {

        const username = req.body.username;
        const password = req.body.password;
        const name = req.body.name;

        let email = req.body.email || '';
        const role = req.body.role || 0;
        const company_id = req.body.company_id || 0;

        let hashedPassword = bcrypt.hashSync(password, 8);

        const query = "INSERT INTO users (username, password, name, email, role, company_id) VALUES (?,?,?,?,?,?)";

        const queryLastInsertedOrder = "SELECT LAST_INSERT_ID() as last_id";

        database.query(query, [username, hashedPassword, name, email, role, company_id]).then(rows => {
            return database.query(queryLastInsertedOrder);
        }).then(rows => {
            res.send({status: true, msg: 'Successfully added new user !', user_id: rows[0].last_id});
        }, err => {
            // AFTER CLOSING THE SERVER NEEDS TO BE RESTARTED
            // return database.close().then(() => {
            throw err;
            // })
        }).catch(err => {
            // handle the error
            console.log('Failed to query.' + err);
            res.status(500);
            res.send({status: false, msg: 'Error ' + err});
        });
    }
});

/**
 * Update user
 */
router.post('/update', authorize(), (req, res) => {

    if (!req.body.id || !req.body.username || !req.body.name || !req.body.email || !req.body.role || !req.body.company_id) {
        res.status(400);
        res.send({status: false, msg: 'Parameters id, username, name, email, role, company_id are required !'});
    } else {

        const id = req.body.id;
        const username = req.body.username;
        const name = req.body.name;
        const email = req.body.email;
        const role = req.body.role;
        const company_id = req.body.company_id;

        let query = "UPDATE users SET username = ?, name = ?, email = ?, role = ?, company_id = ?";
        let args = [username, name, email, role, company_id];

        query += " WHERE id = ?";
        args.push(id);

        database.query(query, args).then(rows => {
            res.send({
                status: true,
                msg: 'Successfully updated user: ' + id
            });
        }, err => {
            // AFTER CLOSING THE SERVER NEEDS TO BE RESTARTED
            // return database.close().then(() => {
            throw err;
            // })
        }).catch(err => {
            // handle the error
            console.log('Failed to query.' + err);
            res.sendStatus(500);
            res.end();
        });
    }
});

/**
 * Update users password
 */
router.post('/update/password', authorize(), (req, res) => {

    if (!req.body.id || req.body.admin_change === undefined) {
        res.status(400);
        res.send({status: false, msg: 'Parameter id, admin_change are required !'});
    } else if (req.body.admin_change === 0 && !req.body.old_password) {
        res.status(400);
        res.send({status: false, msg: 'Parameter old_password is required !'});
    } else if (!req.body.new_password) {
        res.status(400);
        res.send({status: false, msg: 'Parameter new_password is required !'});
    } else {
        const id = req.body.id;
        const old_password = req.body.old_password;
        const new_password = req.body.new_password;
        const admin_change = req.body.admin_change;

        console.log('id', id);
        console.log('pass', old_password);
        console.log('new pass', new_password);
        console.log('admin_change', admin_change);

        let isAdmin = false;
        if (admin_change === 1) {
            isAdmin = true;
        }

        // Check if the old_password is valid
        const checkOldPassQuery = "SELECT * FROM users WHERE id = ?";
        let passwordIsValid = true;

        database.query(checkOldPassQuery, [id]).then(rows => {
            if (rows.length > 0) {

                // If not admin check the password
                // otherwise continue
                if (!isAdmin) {
                    passwordIsValid = bcrypt.compareSync(old_password, rows[0].password);
                    if (!passwordIsValid) {
                        res.send({status: false, msg: 'Invalid old password.', prompt: 0});
                    }
                }

                if (passwordIsValid) {

                    let hashedPassword = bcrypt.hashSync(new_password, 8);

                    const query = "UPDATE users SET password = ? WHERE id = ?";

                    database.query(query, [hashedPassword, id]).then(rows => {
                        res.send({
                            status: true,
                            msg: 'Successfully updated user: ' + id + " + " + new_password
                        });
                    }, err => {
                        // AFTER CLOSING THE SERVER NEEDS TO BE RESTARTED
                        // return database.close().then(() => {
                        throw err;
                        // })
                    }).catch(err => {
                        // handle the error
                        console.log('Failed to query. 2222 ' + err);
                        // res.sendStatus(500);
                        // res.end();
                    });


                }
            } else {
                res.send({status: false, msg: 'User not found.', prompt: -1});
            }
        }, err => {
            // AFTER CLOSING THE SERVER NEEDS TO BE RESTARTED
            // return database.close().then(() => {
            throw err;
            // })
        }).then(() => {

        }).catch(err => {
            // handle the error
            console.log('Failed to query. 333 ' + err);
            res.sendStatus(500);
            res.end();
        });


    }
});

/**
 * Delete user
 */
router.post('/delete', authorize(), (req, res) => {

    if (!req.body.id) {
        res.status(400);
        res.send({status: false, msg: 'Parameter id is required !'});
    } else {
        const id = req.body.id;

        console.log('id', id);

        const query = "DELETE FROM users WHERE id = ?";

        database.query(query, [id]).then(rows => {

        }, err => {
            // AFTER CLOSING THE SERVER NEEDS TO BE RESTARTED
            // return database.close().then(() => {
            throw err;
            // })
        }).then(() => {
            res.send({status: true, msg: 'Successfully deleted user: ' + id});
        }).catch(err => {
            // handle the error
            console.log('Failed to query.' + err);
            res.sendStatus(500);
            res.end();
        });
    }
});

/**
 * Log the user in.
 * User needs to provide pw and email, this is then compared to the pw in the "database"
 * If pw and email match, the user is fetched and sent back.
 * Finally the user is returned from the request.
 */
router.post('/auth', (req, res) => {

    if (!req.body.username || !req.body.password) {
        res.status(400);
        res.send({status: false, msg: 'Parameters username and password are required !'});
    } else {
        let username = req.body.username;
        let password = req.body.password;

        const query = "SELECT c.name as organization, u.* FROM users as u, companies as c where username = ? and company_id = c.id";

        database.query(query, [username]).then(rows => {
            if (rows.length > 0) {

                const user = {...rows[0]};

                let passwordIsValid = bcrypt.compareSync(password, user.password);

                if (!passwordIsValid) {
                    res.send({status: false, msg: 'Invalid password.', prompt: 0});
                } else {

                    let token = jwt.sign({id: user.id}, config.secret, {
                        expiresIn: 86400 // expires in 24 hours
                        // expiresIn: 10
                    });

                    delete user.password;

                    let refresh_token = uuidv4()

                    let query = "INSERT INTO refresh_tokens (refresh_token, user_id, date_created, expiry_date) VALUES (?,?,NOW(),?)"

                    // save refresh_token in database
                    database.query(query, [refresh_token, user.id, moment().add(1, 'day').format('YYYY-MM-DD HH:mm:ss')]).then((result, error) => {
                        if (error) {
                            console.log('error', error)
                            return res.status(500).send({
                                status: false,
                                message: 'Failed to add refresh token!'
                            });
                        } else {
                            res.status(200).send({
                                status: true,
                                user: user,
                                token: token,
                                refresh_token: refresh_token
                            });
                        }
                    })
                }
            } else {
                return res.send({status: false, msg: 'User not found.', prompt: -1});
            }
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
    }
});

/**
 * Route for logging out the user
 *
 */
router.post("/logout", (req, res) => {
    let refresh_token = req.body.refresh_token

    if (!req.body.refresh_token) {
        res.status(400).send({status: false, msg: "Refresh token is required."})
    } else {
        database.query("DELETE refresh_tokens FROM refresh_tokens WHERE refresh_token = ?", [refresh_token]).then(rows => {
            res.send({status: true, msg: "You've been successfully logged out."})
        }, err => {
            throw err;
        }).catch(err => {
            // handle the error
            res.status(500);
            res.send(res.send({status: false, prompt: 'ERROR: ' + err}));
        })
    }
})

/**
 * Route for token validation and route permission credentials
 *
 */
router.post('/check-token', authorize(), (req, res) => {
    let access = req.body.routeAccessCredentials

    if (!access) {
        res.status(400).send({status: true, msg: "Route access credentials are required."})
    } else {
        // parse body params and check if route path includes user role
        if (access.includes(req.userRole)) {
            res.send({status: true, userRole: req.userRole, userId: req.userId, companyId: req.company_id})
        } else {
            res.status(403).send({status: false})
        }
    }
})

/**
 * Check if the provided username already exists
 */
router.post('/validateUsername', (req, res) => {

    // Check if required parameters were sent
    if (!req.body.username) {
        res.status(400);
        res.send({status: false, msg: 'Parameter username is required !'});
    } else {

        // Parse the sent parameters
        const username = req.body.username;

        console.log('Name', username);

        const query = "SELECT * FROM users WHERE username = ?";

        database.query(query, [username]).then(rows => {
            if (rows.length === 0) {
                res.send({
                    status: true,
                    msg: 'Username ' + username + ' is available!'
                });
            } else {
                res.send({
                    status: false,
                    msg: 'Username ' + username + ' is already taken!'
                });
            }
        }, err => {
            throw err;
        }).catch(err => {
            // handle the error
            console.log('Failed to query.' + err);
            res.sendStatus(500);
            res.end();
        });
    }
});

/**
 * Check if the provided email already exists
 */
router.post('/validateEmail', (req, res) => {

    // Check if required parameters were sent
    if (!req.body.email) {
        res.status(400);
        res.send({status: false, msg: 'Parameter email is required !'});
    } else {

        // Parse the sent parameters
        const email = req.body.email;

        console.log('email', email);

        const query = "SELECT * FROM users WHERE email = ?";

        database.query(query, [email]).then(rows => {
            if (rows.length === 0) {
                res.send({
                    status: true,
                    msg: 'Email ' + email + ' is available!'
                });
            } else {
                res.send({
                    status: false,
                    msg: 'Email ' + email + ' is already taken!'
                });
            }
        }, err => {
            throw err;
        }).catch(err => {
            // handle the error
            console.log('Failed to query.' + err);
            res.sendStatus(500);
            res.end();
        });
    }
});

/**
 * Route for checking token validity
 */
router.post('/checkAuthToken', (req, res) => {

    // Check if required parameters were sent
    if (!req.body.token) {
        res.status(400);
        res.send({status: false, msg: 'Parameter token is required !'});
    } else {

        // Parse the sent parameters
        let token = req.body.token;

        let today = Date.now();

        const query = "SELECT * FROM users WHERE token = ? AND token_expire >= ?";

        database.query(query, [token, today]).then(rows => {
            if (rows.length > 0) {
                res.send({
                    status: true, msg: 'Token is valid.', prompt: 1
                });
            } else {
                res.send({status: false, msg: 'Token is either invalid or expired.', prompt: -1});
            }
        }, err => {
            throw err;
        }).catch(err => {
            // handle the error
            res.status(500);
            res.send(res.send({status: false, prompt: 'ERROR: ' + err}));
        });
    }
});

/**
 * Update password for a user
 */
router.post('/newPass', (req, res) => {

    // Check if required parameters were sent
    if (!req.body.token || req.body.password === undefined) {
        res.status(400);
        res.send({status: false, msg: 'Parameters token and password are required !'});
    } else {

        // Parse the sent parameters
        let token = req.body.token;
        let password = req.body.password;

        let today = Date.now();

        let hashedPassword = bcrypt.hashSync(password, 8);

        const changePassQuery = "UPDATE users SET password = ?, token_expire = ? WHERE token = ?";

        database.query(changePassQuery, [hashedPassword, today, token]).then(rows => {

            res.send({
                status: true, msg: 'Successfully update password for user.'
            });
        }, err => {
            throw err;
        }).catch(err => {
            // handle the error
            res.status(500);
            res.send(res.send({status: false, prompt: 'ERROR: ' + err}));
        });
    }
});

module.exports = router;

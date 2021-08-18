var express = require('express');
var router = express.Router();

const Database = require('./../db/dbManager');
const authorize = require("../middlewares/checkPermissions");
const database = new Database();

/**
 * FILTER BY
 */
router.get("/filterBy", function (req, res) {
    let how_many = +req.query.how_many || 25
    let offset = +req.query.offset || 0

    const params = [];
    name = req.query.name || 'all'

    let select_sql = 'SELECT * FROM companies WHERE 1 = 1';

    if (name !== 'all') {
        select_sql += " AND name LIKE ?";
        params.push('%' + name + '%');
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
 * Validate customer
 *
 */
router.get("/validateCompany", authorize(), function (req, res) {
    const params = [];

    let id = req.query.id || ''
    let company_name = req.query.name || ''
    let type = req.query.type;

    let select_sql = 'SELECT * FROM companies WHERE 0 = 0';

    if (id) {
        select_sql += " AND id != ?";
        params.push(id);
    }

    if (type === 'name') {
        if (company_name) {
            select_sql += " AND name = ?";
            params.push(company_name);
        }
    }

    database.query(select_sql, params).then(rows => {
        if (rows.length > 0) {
            res.send({status: true, exists: true})
        } else {
            res.send({status: true, exists: false})
        }
    }, err => {
        throw err
    }).catch(err => {
        // handle the error
        console.log('Failed to query.' + err);
        res.status(500);
        res.send({status: false, msg: 'Error ' + err});
    });
})

/**
 * Get companies
 */
router.get('/', authorize(), (req, res, next) => {

    const query = "SELECT * from companies";

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
 * Route for retrieving company
 */
router.get("/getCompany/:id", function (req, res) {
    if (!req.params.id) {
        res.status(400).send({status: false, msg: "Route param id of user is required."})
    } else {
        database.query("SELECT * FROM companies WHERE id = ?", [req.params.id]).then(rows => {
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
 * Add company
 */
router.post('/add', authorize(), (req, res) => {

    if (!req.body.name) {
        res.status(400);
        res.send({status: false, msg: 'Parameters username, password and name are required !'});
    } else {

        const name = req.body.name;

        const query = "INSERT INTO companies (name) VALUES (?)";

        const lastId = "SELECT LAST_INSERT_ID() as last_id";

        database.query(query, [name]).then(rows => {
            return database.query(lastId);
        }).then(rows => {
            res.send({status: true, msg: 'Successfully added new company !', company_id: rows[0].last_id});
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
 * Update company
 */
router.post('/update', authorize(), (req, res) => {

    if (!req.body.id || !req.body.name) {
        res.status(400);
        res.send({status: false, msg: 'Provide all required parameters !'});
    } else {

        const id = req.body.id;
        const name = req.body.name;

        let query = "UPDATE companies SET name = ?";
        let args = [name];

        query += " WHERE id = ?";
        args.push(id);

        database.query(query, args).then(rows => {
            res.send({
                status: true,
                msg: 'Successfully updated company: ' + id
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
 * Update company
 */
router.post('/delete', authorize(), (req, res) => {

    if (!req.body.id) {
        res.status(400);
        res.send({status: false, msg: 'Provide all required parameters !'});
    } else {

        const id = req.body.id;

        let query = "DELETE FROM companies WHERE id = ?";

        database.query(query, [id]).then(rows => {
            res.send({
                status: true,
                msg: 'Successfully updated company: ' + id
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

module.exports = router;

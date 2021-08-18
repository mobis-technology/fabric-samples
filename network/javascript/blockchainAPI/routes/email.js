const express = require('express');
const router = express.Router();
const path = require('path');
const MailConfig = require('../config/email');
const hbs = require('nodemailer-express-handlebars');
const Handlebars = require('handlebars');
const moment = require("moment");
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
router.use(bodyParser.json());

const config = require('./../config');
const jwt = config.jwt;

const Database = require('./../db/dbManager');

const database = new Database();

const nodemailer = require('nodemailer');

let smtpTransporter = nodemailer.createTransport({
    // port: 465,
    // host: process.env.AWS_REGION,
    // secure: true,
    // auth: {
    //     user: process.env.AWS_ACCESS_KEY_ID,
    //     pass: process.env.AWS_SECRET_ACCESS_KEY,
    // }

    port: 465,
    host: 'email-smtp.eu-west-1.amazonaws.com',
    secure: true,
    auth: {
        user: 'AKIAVNZY4AA5A6TGN7GP',
        pass: 'BLVv/679ZES1+XlwZ5o0k8mLTzRZbmqk1gREkdMEDwJY',
    }
});

Handlebars.registerHelper('eq', function (val1, val2, options) {
    if (val1 === val2) {
        return options.fn(this)
    }
    return options.inverse(this)
})

Handlebars.registerHelper('greater', function (val1, val2, options) {
    if (val1 > val2) {
        return options.fn(this)
    }
    return options.inverse(this)
})

/**
 * Send reset password link to the user from the ERPsystem
 */

router.post('/reset_password', (req, res, next) => {

    if (req.body.email === undefined) {
        res.status(400);
        res.send({status: false, msg: 'Provide all required parameters (email)!'});
    } else {

        let email = req.body.email;
        const query = "SELECT * FROM users WHERE email = ?";

        const updateToken = "UPDATE users SET token = ?, token_expire = ? WHERE id = ?";

        database.query(query, [email]).then(rows => {
            // check if provided email is connected to an existing user
            if (rows.length > 0) {

                // Generate unique token for the specific case
                let token = jwt.sign({id: rows[0].id}, config.secret, {
                    expiresIn: 86400 // expires in 24 hours
                });

                let token_expire = moment().add(7,'days').toISOString(true);

                // The reset password url link
                let url = 'http://localhost:4200/reset-password?token=' + token;

                MailConfig.ViewOption(smtpTransporter, hbs);
                let HelperOptions = {
                    from: '"AIPAN" <aipan@mail.sistem.pro>',
                    to: email,
                    subject: 'Ponastavitev gesla',
                    template: 'reset_password_erp',
                    context: {
                        // logo: logoUrl,
                        url: url,
                        username: rows[0].username
                    }
                };

                smtpTransporter.sendMail(HelperOptions, (error, info) => {
                    if (error) {
                        console.log(error);
                        return res.json(error);
                    } else {
                        database.query(updateToken, [token, token_expire, rows[0].id]).then(rows => {
                            res.send({status: true, msg: 'Recovery email was sent.', prompt: info});
                        }, err => {
                            throw err
                        }).catch(err => {
                            res.status(500);
                            res.send(res.send({status: false, prompt: 'ERROR: ' + err}));
                        });
                    }
                });

            } else {
                // If email is not connected to a user - return the proper response
                res.send({status: false, msg: 'Email not found.', prompt: -1});
            }
        }, err => {
            throw err;
        }).catch(err => {
            // handle the error
            // res.status(500);
            // res.send(res.send({status: false, prompt: 'ERROR: ' + err}));
        });
    }
});

module.exports = router;

var express = require('express');
var router = express.Router();

'use strict';

const {Gateway, Wallets} = require('fabric-network');
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');

const authorize = require('../middlewares/checkPermissions');

function executeTransaction(query, data) {/**/

    return new Promise(async (resolve, reject) => {

        try {

            // load the network configuration
            const ccpPath = path.resolve(__dirname, '..', '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

            // Create a new file system based wallet for managing identities.
            const walletPath = path.resolve(__dirname, '..', '../wallet');
            const wallet = await Wallets.newFileSystemWallet(walletPath);
            // console.log(`Wallet path: ${walletPath}`);

            // Check to see if we've already enrolled the user.
            const identity = await wallet.get('winteh');
            if (!identity) {
                console.log('An identity for the user "winteh" does not exist in the wallet');
                console.log('Run the registerUser.js application before retrying');
                return;
            }
            let result = null;
            // Create a new gateway for connecting to our peer node.
            const gateway = new Gateway();
            await gateway.connect(ccp, {
                wallet,
                identity: data.userInfo.userName,
                discovery: {enabled: true, asLocalhost: true}
            });

            // Get the network (channel) our contract is deployed to.
            const network = await gateway.getNetwork('aipanchannel');

            // Get the contract from the network.
            const contract = network.getContract('aipan');

            // Evaluate the specified transaction.
            switch (query) {
                /**
                 * SENSORS
                 */
                case 'getAllSensors':
                    result = await contract.evaluateTransaction('querySensorEntries', {});
                    resolve(JSON.parse(result.toString()).results)
                    break;
                case 'createSensorEntry':
                    result = await contract.submitTransaction('createSensorEntry', JSON.stringify(data));
                    resolve(JSON.parse(result.toString()));
                    break;
                case 'querySensorEntry':
                    result = await contract.evaluateTransaction('querySensorEntry', JSON.stringify(data));
                    resolve(result.toString())
                    break;

                /**
                 * PANELS
                 */
                case 'getAllPanels':
                    result = await contract.evaluateTransaction('queryPanelEntries', {});
                    // console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
                    // console.log('JSON.parse(result.toString())', JSON.parse(result.toString()))
                    resolve(JSON.parse(result.toString()).results)
                    break;
                case 'createPanelEntry':
                    result = await contract.submitTransaction('createPanelEntry', JSON.stringify(data));
                    console.log('Transaction has been submitted');
                    resolve(JSON.parse(result.toString()));
                    break;
                case 'queryPanelEntry':
                    result = await contract.evaluateTransaction('queryPanelEntry', JSON.stringify(data));
                    // console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
                    resolve(result.toString())
                    break;
                case 'queryPanelEntryInformation':
                    result = await contract.evaluateTransaction('queryPanelEntryInformation', JSON.stringify(data));
                    // console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
                    resolve(result.toString())
                    break;
                case 'updatePanelEntry':
                    result = await contract.submitTransaction('updatePanelEntry', JSON.stringify(data));
                    // console.log('Transaction has been submitted');
                    resolve(JSON.parse(result.toString()));
                    break;

                /**
                 * PANEL FLOORING
                 */
                case 'queryPanelFloorEntries':
                    result = await contract.evaluateTransaction('queryPanelFloorEntries', {});
                    // console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
                    // console.log('JSON.parse(result.toString())', JSON.parse(result.toString()))
                    resolve(JSON.parse(result.toString()).results)
                    break;
                case 'createPanelFloorEntry':
                    result = await contract.submitTransaction('createPanelFloorEntry', JSON.stringify(data));
                    // console.log('Transaction has been submitted');
                    resolve(JSON.parse(result.toString()));
                    break;
                case 'queryPanelFloorEntry':
                    result = await contract.evaluateTransaction('queryPanelFloorEntry', JSON.stringify(data));
                    // console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
                    resolve(result.toString())
                    break;
                case 'updatePanelFloorEntry':
                    result = await contract.submitTransaction('updatePanelFloorEntry', JSON.stringify(data));
                    console.log('Transaction has been submitted');
                    resolve(JSON.parse(result.toString()));
                    break;

                /**
                 * PANEL INSULATION
                 */
                case 'queryPanelInsulationEntries':
                    result = await contract.evaluateTransaction('queryPanelInsulationEntries', {});
                    // console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
                    // console.log('JSON.parse(result.toString())', JSON.parse(result.toString()))
                    resolve(JSON.parse(result.toString()).results)
                    break;
                case 'createPanelInsulationEntry':
                    result = await contract.submitTransaction('createPanelInsulationEntry', JSON.stringify(data));
                    // console.log('Transaction has been submitted');
                    resolve(JSON.parse(result.toString()));
                    break;
                case 'queryPanelInsulationEntry':
                    result = await contract.evaluateTransaction('queryPanelInsulationEntry', JSON.stringify(data));
                    // console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
                    resolve(result.toString())
                    break;
                case 'updatePanelInsulationEntry':
                    result = await contract.submitTransaction('updatePanelInsulationEntry', JSON.stringify(data));
                    // console.log('Transaction has been submitted');
                    resolve(JSON.parse(result.toString()));
                    break;

                /**
                 * GENERAL
                 */
                case 'queryHistoryForKey':
                    result = await contract.evaluateTransaction('queryHistoryForKey', JSON.stringify(data));
                    // console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
                    resolve(result.toString())
                    break;

                default:
                    reject({
                        message: 'executeTransaction query switch default'
                    });
                    console.log('executeTransaction query switch default')
                    break;
            }

            // Disconnect from the gateway.
            await gateway.disconnect();

        } catch (error) {
            reject(error);
            // console.error(`Failed to evaluate transaction: ${error}`);
            // process.exit(1);
        }
    });
}

/************************************************************************************************
 *
 * AIPAN SENSORS endpoints
 *
 ************************************************************************************************/

/**
 * Get all sensor entries last value
 */
router.get('/getAllSensors', authorize(), function (req, res, next) {

    let data = {};
    data['userInfo'] = {
        userName: req.userName
    }

    executeTransaction('getAllSensors', data).then(value => {
        if (value) {
            res.send({status: true, data: value});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/**
 * Get sensor entry last value
 */
router.post('/querySensorEntry', authorize(), function (req, res, next) {

    let data = req.body;
    data['userInfo'] = {
        userName: req.userName
    }

    executeTransaction('querySensorEntry', data).then(value => {
        if (value) {
            res.send({status: true, data: JSON.parse(value).data});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/**
 * Add sensor entry
 */
router.post('/createSensorEntry', authorize(), function (req, res, next) {

    let data = req.body;
    data['userInfo'] = {
        userName: req.userName,
        organization: req.organization,
        userId: req.userId
    }

    executeTransaction('createSensorEntry', data).then(value => {
        if (value) {
            res.send({status: true, msg: 'Transaction has been submitted', txId: value.txId});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/**
 * Update the data for sensor
 */
router.post('/updateSensorEntry', authorize(), function (req, res, next) {

    let data = req.body;
    data['userInfo'] = {
        userName: req.userName,
        organization: req.organization,
        userId: req.userId
    }

    executeTransaction('updateSensorEntry', data).then(value => {
        if (value) {
            res.send({status: true, msg: 'Transaction has been submitted', txId: value.txId});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/************************************************************************************************
 *
 * AIPAN PANEL MANUFACTURE INFORMATION endpoints
 *
 ************************************************************************************************/

/**
 * Get all panel entries last value
 */
router.get('/getAllPanels',  authorize(), function (req, res, next) {

    let data = {};
    data['userInfo'] = {
        userName: req.userName
    }

    executeTransaction('getAllPanels', data).then(value => {
        if (value) {
            res.send({status: true, data: value});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/**
 * Get specific panel entry full information
 */
router.get('/getPanelInfo/:serial', authorize(), function (req, res, next) {

    let data = {serial_num: req.params.serial};
    console.log('data', data);
    data['userInfo'] = {
        userName: req.userName
    }

    executeTransaction('queryPanelEntryInformation', data).then(value => {
        if (value) {
            res.send({status: true, data: JSON.parse(value)});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/**
 * Get panel entry last value
 */
router.post('/queryPanelEntry', authorize(), function (req, res, next) {

    let data = req.body;
    data['userInfo'] = {
        userName: req.userName
    }

    executeTransaction('queryPanelEntry', data).then(value => {
        if (value) {
            res.send({status: true, data: JSON.parse(value)});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/**
 * Add panel entry
 */
router.post('/createPanelEntry', authorize(), function (req, res, next) {

    let data = req.body;
    data['userInfo'] = {
        userName: req.userName,
        organization: req.organization,
        userId: req.userId
    }

    executeTransaction('createPanelEntry', data).then(value => {
        if (value) {
            res.send({status: true, msg: 'Transaction has been submitted', txId: value.txId});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/**
 * Update the data for panel
 */
router.post('/updatePanelEntry', authorize(), function (req, res, next) {

    let data = req.body;
    data['userInfo'] = {
        userName: req.userName,
        organization: req.organization,
        userId: req.userId
    }

    executeTransaction('updatePanelEntry', data).then(value => {
        if (value) {
            res.send({status: true, msg: 'Transaction has been submitted', txId: value.txId});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/************************************************************************************************
 *
 * AIPAN PANEL MANUFACTURE INFORMATION endpoints - FLOORING
 *
 ************************************************************************************************/

/**
 * Get all panel flooring entries last value
 */
router.get('/getAllPanelFloorings', authorize(), function (req, res, next) {

    let data = {};
    data['userInfo'] = {
        userName: req.userName
    }

    executeTransaction('queryPanelFloorEntries', data).then(value => {
        if (value) {
            res.send({status: true, data: value});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/**
 * Get panel flooring entry last value
 */
router.post('/queryPanelFlooringEntry', authorize(), function (req, res, next) {

    let data = req.body;
    data['userInfo'] = {
        userName: req.userName
    }

    executeTransaction('queryPanelFloorEntry', data).then(value => {
        if (value) {
            res.send({status: true, data: JSON.parse(value)});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/**
 * Add panel flooring entry
 */
router.post('/createPanelFlooringEntry', authorize(), function (req, res, next) {

    let data = req.body;
    data['userInfo'] = {
        userName: req.userName,
        organization: req.organization,
        userId: req.userId
    }

    executeTransaction('createPanelFloorEntry', data).then(value => {
        if (value) {
            res.send({status: true, msg: 'Transaction has been submitted', txId: value.txId});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/**
 * Update the data for panel flooring
 */
router.post('/updatePanelFlooringEntry', authorize(), function (req, res, next) {

    let data = req.body;
    data['userInfo'] = {
        userName: req.userName,
        organization: req.organization,
        userId: req.userId
    }

    executeTransaction('updatePanelFloorEntry', data).then(value => {
        if (value) {
            res.send({status: true, msg: 'Transaction has been submitted', txId: value.txId});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/************************************************************************************************
 *
 * AIPAN PANEL MANUFACTURE INFORMATION endpoints - INSULATION
 *
 ************************************************************************************************/

/**
 * Get all panel insulation entries last value
 */
router.get('/getAllPanelInsulations', authorize(), function (req, res, next) {

    let data = {};
    data['userInfo'] = {
        userName: req.userName
    }

    executeTransaction('queryPanelInsulationEntries', data).then(value => {
        if (value) {
            res.send({status: true, data: value});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/**
 * Get panel insulation entry last value
 */
router.post('/queryPanelInsulationEntry', authorize(), function (req, res, next) {

    let data = req.body;
    data['userInfo'] = {
        userName: req.userName
    }

    executeTransaction('queryPanelInsulationEntry', data).then(value => {
        if (value) {
            res.send({status: true, data: JSON.parse(value)});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/**
 * Add panel insulation entry
 */
router.post('/createPanelInsulationEntry', authorize(), function (req, res, next) {

    let data = req.body;
    data['userInfo'] = {
        userName: req.userName,
        organization: req.organization,
        userId: req.userId
    }

    executeTransaction('createPanelInsulationEntry', data).then(value => {
        if (value) {
            res.send({status: true, msg: 'Transaction has been submitted', txId: value.txId});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/**
 * Update the data for panel insulation
 */
router.post('/updatePanelInsulationEntry', authorize(), function (req, res, next) {

    let data = req.body;
    data['userInfo'] = {
        userName: req.userName,
        organization: req.organization,
        userId: req.userId
    }

    executeTransaction('updatePanelInsulationEntry', data).then(value => {
        if (value) {
            res.send({status: true, msg: 'Transaction has been submitted', txId: value.txId});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

/************************************************************************************************
 *
 * General endpoints
 *
 ************************************************************************************************/

/**
 * Get history for key
 */
router.post('/queryHistoryForKey', authorize(), function (req, res, next) {

    let data = req.body;
    data['userInfo'] = {
        userName: req.userName
    }

    executeTransaction('queryHistoryForKey', data).then(value => {
        if (value) {

            let recordArray = JSON.parse(value);

            recordArray.forEach(record => {
                record.Timestamp = dayjs.unix(record.Timestamp.seconds).toISOString();
            })

            res.send({status: true, data: recordArray});
        }
    }).catch(error => {
        console.log('error', error)
        res.status(400).send({status: false, msg: error.message})
    });

});

module.exports = router;

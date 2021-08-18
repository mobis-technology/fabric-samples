/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const {Contract} = require('fabric-contract-api');
const util = require('util');

/************************************************************************************************
 *
 * GENERAL FUNCTIONS
 *
 ************************************************************************************************/

/**
 * Executes a query using a specific key
 *
 * @param {*} key - the key to use in the query
 */
async function queryByKey(stub, key) {
    console.log('============= START : queryByKey ===========');
    console.log('##### queryByKey key: ' + key);

    let resultAsBytes = await stub.getState(key);
    if (!resultAsBytes || resultAsBytes.toString().length <= 0) {
        throw new Error('##### queryByKey key: ' + key + ' does not exist');
    }
    console.log('##### queryByKey response: ' + resultAsBytes);
    console.log('============= END : queryByKey ===========');
    return resultAsBytes.toString('utf8');
}

/**
 * Executes a query based on a provided queryString
 *
 * I originally wrote this function to handle rich queries via CouchDB, but subsequently needed
 * to support LevelDB range queries where CouchDB was not available.
 *
 * @param {*} queryString - the query string to execute
 */
async function queryByString(stub, queryString) {
    console.log('============= START : queryByString ===========');
    console.log("##### queryByString queryString: " + queryString);

    // CouchDB Query
    let iterator = await stub.getQueryResult(queryString);

    // Equivalent LevelDB Query. We need to parse queryString to determine what is being queried
    // In this chaincode, all queries will either query ALL records for a specific entryType, or
    // they will filter ALL the records looking for a specific sensor etc. So far,
    // in this chaincode there is a maximum of one filter parameter in addition to the entryType.
    // let entryType = "";
    // let startKey = "";
    // let endKey = "";
    // let jsonQueryString = JSON.parse(queryString);
    // if (jsonQueryString['selector'] && jsonQueryString['selector']['entryType']) {
    //     entryType = jsonQueryString['selector']['entryType'];
    //     startKey = entryType + "0";
    //     endKey = entryType + "z";
    // } else {
    //     throw new Error('##### queryByString - Cannot call queryByString without a entryType element: ' + queryString);
    // }
    //
    // let iterator = await stub.getStateByRange(startKey, endKey);

    // Iterator handling is identical for both CouchDB and LevelDB result sets, with the
    // exception of the filter handling in the commented section below
    let allResults = [];
    while (true) {
        let res = await iterator.next();

        if (res.value && res.value.value.toString()) {
            let jsonRes = {};
            console.log('##### queryByString iterator: ' + res.value.value.toString('utf8'));

            jsonRes.Key = res.value.key;
            try {
                jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
            } catch (err) {
                console.log('##### queryByString error: ' + err);
                jsonRes.Record = res.value.value.toString('utf8');
            }
            // ******************* LevelDB filter handling ******************************************
            // // LevelDB: additional code required to filter out records we don't need
            // // Check that each filter condition in jsonQueryString can be found in the iterator json
            // // If we are using CouchDB, this isn't required as rich query supports selectors
            // let jsonRecord = jsonQueryString['selector'];
            // // If there is only a entryType, no need to filter, just return all
            // console.log('##### queryByString jsonRecord - number of JSON keys: ' + Object.keys(jsonRecord).length);
            // if (Object.keys(jsonRecord).length == 1) {
            //     allResults.push(jsonRes);
            //     continue;
            // }
            // for (var key in jsonRecord) {
            //     if (jsonRecord.hasOwnProperty(key)) {
            //         console.log('##### queryByString jsonRecord key: ' + key + " value: " + jsonRecord[key]);
            //         if (key == "entryType") {
            //             continue;
            //         }
            //         console.log('##### queryByString json iterator has key: ' + jsonRes.Record[key]);
            //         if (!(jsonRes.Record[key] && jsonRes.Record[key] == jsonRecord[key])) {
            //             // we do not want this record as it does not match the filter criteria
            //             continue;
            //         }
            //         allResults.push(jsonRes);
            //     }
            // }
            // ******************* End LevelDB filter handling ******************************************

            // For CouchDB, push all results
            allResults.push(jsonRes);
        }
        if (res.done) {
            await iterator.close();

            console.log('##### queryByString all results: ' + JSON.stringify(allResults));

            // The transaction ID for the current chaincode invocation request. The transaction ID uniquely identifies the transaction within the scope of the channel.
            let txId = stub.getTxID();

            let returnObj = {
                txId: txId,
                results: allResults
            }

            console.log('============= END : queryByString ===========');
            return JSON.stringify(returnObj);
        }
    }
}

class Aipan extends Contract {

    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
    }

    /************************************************************************************************
     *
     * AIPAN SENSORS functions
     *
     ************************************************************************************************/

    /**
     * Add new entry from the sensors
     *
     * @param {*} ctx
     * @param {*} args - JSON as follows:
     {
     *"mac":"1771ADEADBEEF",
     *"data":[
     *  {
     *   "id":18,
     *   "start":"2020-04-06",
     *   "end":“2020-04-07”,
     *   "resistive":{
     *      "max":14.50,
     *      "avg":14.10
     *   },
     *   "capacitive":{
     *      "max":13.20,
     *      "avg":13.30
     *   },
     *   "air":{
     *      "temperature":{
     *         "max":22.10,
     *         "avg":20.30,
     *         "min":19.20
     *      },
     *      "humidity":{
     *         "max":16.80,
     *         "avg":14.30
     *      }
     *   }
     * },
     *      {
     *   "id":7,
     *   "start":"2020-04-08",
     *   "end":“2020-04-09”,
     *   "resistive":{
     *      "max":13.50,
     *      "avg":14.20
     *   },
     *   "capacitive":{
     *      "max":11.20,
     *      "avg":12.10
     *   },
     *   "air":{
     *      "temperature":{
     *         "max":20.10,
     *         "avg":18.30,
     *         "min":16.20
     *      },
     *      "humidity":{
     *         "max":13.80,
     *         "avg":11.30
     *      }
     *   }
     * },
     *      {
     *   "id":9,
     *   "start":"2020-04-06",
     *   "end":“2020-04-07”,
     *   "resistive":{
     *      "max":13.50,
     *      "avg":12.30
     *   },
     *   "capacitive":{
     *      "max":12.20,
     *      "avg":11.30
     *   },
     *   "air":{
     *      "temperature":{
     *         "max":20.10,
     *         "avg":18.30,
     *         "min":17.20
     *      },
     *      "humidity":{
     *         "max":14.80,
     *         "avg":10.30
     *      }
     *   }
     * },
     * ]
     * }
     */
    async createSensorEntry(ctx, args) {
        console.log('============= START : createSensorEntry ===========');
        console.log('##### createSensorEntry arguments: ' + JSON.stringify(args));

        // args is passed as a JSON string
        let json = JSON.parse(args);
        let key = 'sensor' + json['mac'];
        json['entryType'] = 'sensor';

        console.log('##### createSensorEntry payload: ' + JSON.stringify(json));

        // Check if the entry already exists
        let entryQuery = await ctx.stub.getState(key);
        if (entryQuery.toString()) {
            throw new Error('##### createSensorEntry - This entry already exists: ' + json['mac']);
        }

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(json)));

        // The transaction ID for the current chaincode invocation request. The transaction ID uniquely identifies the transaction within the scope of the channel.
        let txId = await ctx.stub.getTxID();

        let returnObj = {
            txId: txId
        }

        console.log('============= END : createSensorEntry ===========');
        return JSON.stringify(returnObj);

    }

    /**
     * Retrieves a specific sensor entry
     *
     * @param {*} ctx
     * @param {*} args
     */
    async querySensorEntry(ctx, args) {
        console.log('============= START : querySensorEntry ===========');
        console.log('##### querySensorEntry arguments: ' + JSON.stringify(args));

        // args is passed as a JSON string
        let json = JSON.parse(args);
        let key = 'sensor' + json['mac'];
        console.log('##### querySensorEntry key: ' + key);

        return queryByKey(ctx.stub, key);
    }

    /**
     * Update sensor data for specific entry
     * @param ctx
     * @param args
     */
    async updateSensorEntry(ctx, args) {
        console.log('============= START : updateSensorEntry ===========');
        console.log('##### updateSensorEntry arguments: ' + JSON.stringify(args));

        // args is passed as a JSON string
        let json = JSON.parse(args);
        let newData = json['data'];
        let newUserName = json['userInfo']['userName'];
        let newOrg = json['userInfo']['organization'];
        let newUserId = json['userInfo']['userId'];
        let key = 'sensor' + json['mac'];

        const sensorEntry = await queryByKey(ctx.stub, key); // get the key from chaincode state
        if (!sensorEntry || sensorEntry.length === 0) {
            throw new Error(`${key} does not exist`);
        }
        const entry = JSON.parse(sensorEntry.toString());
        entry.data = newData;
        entry.userInfo.userId = newUserId;
        entry.userInfo.userName = newUserName;
        entry.userInfo.organization = newOrg;

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(entry)));

        // The transaction ID for the current chaincode invocation request. The transaction ID uniquely identifies the transaction within the scope of the channel.
        let txId = await ctx.stub.getTxID();

        let returnObj = {
            txId: txId
        }

        console.info('============= END : updateSensorEntry ===========');
        return JSON.stringify(returnObj);

    }

    /**
     * Retrieves all sensor entries
     *
     * @param {*} ctx
     * @param {*} args
     */
    async querySensorEntries(ctx, args) {
        console.log('============= START : querySensorEntries ===========');
        console.log('##### querySensorEntries arguments: ' + JSON.stringify(args));

        let queryString = '{"selector": {"entryType": "sensor"}}';
        return queryByString(ctx.stub, queryString);
    }

    /************************************************************************************************
     *
     * AIPAN PANEL MANUFACTURE INFORMATION functions
     *
     ************************************************************************************************/

    /**
     * Add new entry for a panel
     *
     * @param {*} ctx
     * @param {*} args - JSON as follows:
     * {
           "serial_num":"1771ADEADBEEZ"
        }
     */
    async createPanelEntry(ctx, args) {
        console.log('============= START : createPanelEntry ===========');
        console.log('##### createPanelEntry arguments: ' + JSON.stringify(args));

        // args is passed as a JSON string
        let json = JSON.parse(args);
        let key = 'panel' + json['serial_num'];
        json['entryType'] = 'panel';

        console.log('##### createPanelEntry payload: ' + JSON.stringify(json));

        // Check if the entry already exists
        let entryQuery = await ctx.stub.getState(key);
        if (entryQuery.toString()) {
            throw new Error('##### createPanelEntry - This entry already exists: ' + json['mac']);
        }

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(json)));

        // The transaction ID for the current chaincode invocation request. The transaction ID uniquely identifies the transaction within the scope of the channel.
        let txId = await ctx.stub.getTxID();

        let returnObj = {
            txId: txId
        }

        console.log('============= END : createPanelEntry ===========');
        return JSON.stringify(returnObj);

    }

    /**
     * Retrieves a specific panel entry
     *
     * @param {*} ctx
     * @param {*} args
     */
    async queryPanelEntry(ctx, args) {
        console.log('============= START : queryPanelEntry ===========');
        console.log('##### queryPanelEntry arguments: ' + JSON.stringify(args));

        // args is passed as a JSON string
        let json = JSON.parse(args);
        let key = 'panel' + json['serial_num'];
        console.log('##### queryPanelEntry key: ' + key);

        return queryByKey(ctx.stub, key);
    }

    /**
     * Retrieves a specific panel entry connected information (flooring, insulation etc.)
     *
     * @param {*} ctx
     * @param {*} args
     */
    async queryPanelEntryInformation(ctx, args) {
        console.log('============= START : queryPanelEntryInformation ===========');
        console.log('##### queryPanelEntryInformation arguments: ' + JSON.stringify(args));

        // args is passed as a JSON string
        let json = JSON.parse(args);
        let key = '' + json['serial_num'];
        console.log('##### queryPanelEntryInformation key: ' + key);

        let queryString = '{"selector": {"serial_num": "' + key.toString() + '"}}';
        return queryByString(ctx.stub, queryString);
    }

    /**
     * Update panel data for specific entry
     * @param ctx
     * @param args
     */
    async updatePanelEntry(ctx, args) {
        console.log('============= START : updatePanelEntry ===========');
        console.log('##### updatePanelEntry arguments: ' + JSON.stringify(args));

        // args is passed as a JSON string
        let json = JSON.parse(args);
        let newData = json['data'];
        let newUserName = json['userInfo']['userName'];
        let newOrg = json['userInfo']['organization'];
        let newUserId = json['userInfo']['userId'];
        let key = 'panel' + json['serial_num'];

        const panelEntry = await queryByKey(ctx.stub, key); // get the key from chaincode state
        if (!panelEntry || panelEntry.length === 0) {
            throw new Error(`${key} does not exist`);
        }
        const entry = JSON.parse(panelEntry.toString());
        entry.data = newData;
        entry.userInfo.userId = newUserId;
        entry.userInfo.userName = newUserName;
        entry.userInfo.organization = newOrg;

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(entry)));

        // The transaction ID for the current chaincode invocation request. The transaction ID uniquely identifies the transaction within the scope of the channel.
        let txId = await ctx.stub.getTxID();

        let returnObj = {
            txId: txId
        }

        console.info('============= END : updatePanelEntry ===========');
        return JSON.stringify(returnObj);

    }

    /**
     * Retrieves all panel entries
     *
     * @param {*} ctx
     * @param {*} args
     */
    async queryPanelEntries(ctx, args) {
        console.log('============= START : queryPanelEntries ===========');
        console.log('##### queryPanelEntries arguments: ' + JSON.stringify(args));

        let queryString = '{"selector": {"entryType": "panel"}}';
        return queryByString(ctx.stub, queryString);
    }

    /************************************************************************************************
     * AIPAN PANEL MANUFACTURE INFORMATION functions - FLOORING
     ************************************************************************************************/

    /**
     * Add new entry for a panel flooring
     *
     * @param {*} ctx
     * @param {*} args - JSON as follows:
     {
           "serial_num":"1771ADEADBEEZ",
           "data": {
               "material":"parket",
               "vrsta_dekor":"hrast",
               "barva":"svetla",
               "povrs_obdelava":"žagan",
               "povrs_zascita":"lak",
               "povrani_robovi":"2-strani",
               "nacin_pobranih_robov":"okroglo",
               "sirina":500,
               "dolzina":500,
               "debelina":50,
               "vzorec":"kost",
               "sistem_montaze":"klik",
               "nacin_montaze":"pena",
               "talno_gretje":1,
           }
     }
     */
    async createPanelFloorEntry(ctx, args) {
        console.log('============= START : createPanelFloorEntry ===========');
        console.log('##### createPanelFloorEntry arguments: ' + JSON.stringify(args));

        // args is passed as a JSON string
        let json = JSON.parse(args);
        let key = 'pFlooring' + json['serial_num'];
        json['entryType'] = 'pFlooring';

        console.log('##### createPanelFloorEntry payload: ' + JSON.stringify(json));

        // Check if the entry already exists
        let entryQuery = await ctx.stub.getState(key);
        if (entryQuery.toString()) {
            throw new Error('##### createPanelEntry - This entry already exists: ' + json['mac']);
        }

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(json)));

        // The transaction ID for the current chaincode invocation request. The transaction ID uniquely identifies the transaction within the scope of the channel.
        let txId = await ctx.stub.getTxID();

        let returnObj = {
            txId: txId
        }

        console.log('============= END : createPanelFloorEntry ===========');
        return JSON.stringify(returnObj);

    }

    /**
     * Retrieves a specific panel flooring entry
     *
     * @param {*} ctx
     * @param {*} args
     */
    async queryPanelFloorEntry(ctx, args) {
        console.log('============= START : queryPanelFloorEntry ===========');
        console.log('##### queryPanelFloorEntry arguments: ' + JSON.stringify(args));

        // args is passed as a JSON string
        let json = JSON.parse(args);
        let key = 'pFlooring' + json['serial_num'];
        console.log('##### queryPanelFloorEntry key: ' + key);

        return queryByKey(ctx.stub, key);
    }

    /**
     * Update panel flooring data for specific entry
     * @param ctx
     * @param args
     */
    async updatePanelFloorEntry(ctx, args) {
        console.log('============= START : updatePanelFloorEntry ===========');
        console.log('##### updatePanelFloorEntry arguments: ' + JSON.stringify(args));

        // args is passed as a JSON string
        let json = JSON.parse(args);
        let newData = json['data'];
        let newUserName = json['userInfo']['userName'];
        let newOrg = json['userInfo']['organization'];
        let newUserId = json['userInfo']['userId'];
        let key = 'pFlooring' + json['serial_num'];

        const panelEntry = await queryByKey(ctx.stub, key); // get the key from chaincode state
        if (!panelEntry || panelEntry.length === 0) {
            throw new Error(`${key} does not exist`);
        }
        const entry = JSON.parse(panelEntry.toString());
        entry.data = newData;
        entry.userInfo.userId = newUserId;
        entry.userInfo.userName = newUserName;
        entry.userInfo.organization = newOrg;

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(entry)));

        // The transaction ID for the current chaincode invocation request. The transaction ID uniquely identifies the transaction within the scope of the channel.
        let txId = await ctx.stub.getTxID();

        let returnObj = {
            txId: txId
        }

        console.info('============= END : updatePanelFloorEntry ===========');
        return JSON.stringify(returnObj);

    }

    /**
     * Retrieves all panel flooring entries
     *
     * @param {*} ctx
     * @param {*} args
     */
    async queryPanelFloorEntries(ctx, args) {
        console.log('============= START : queryPanelFloorEntries ===========');
        console.log('##### queryPanelFloorEntries arguments: ' + JSON.stringify(args));

        let queryString = '{"selector": {"entryType": "pFlooring"}}';
        return queryByString(ctx.stub, queryString);
    }

    /************************************************************************************************
     * AIPAN PANEL MANUFACTURE INFORMATION functions - INSULATION
     ************************************************************************************************/

    /**
     * Add new entry for a panel insulation
     *
     * @param {*} ctx
     * @param {*} args - JSON as follows:
     {
           "serial_num":"1771ADEADBEEZ",
           "data": {
               "dolzina":125,
               "sirina":60,
               "develina":15,
               "tlacna_trdnost":"med 700 kPa in 800 kPa",
               "toplotna_prevodnost":"med 0,032-0,040 W/mK",
               "naziv":"Fragmat EPS 50",
               "teza":"720 g",
               "zvocna_izolativnost":"25 MN/m^3",
               "toplotna_izolativnost":"0,039 W/mK",
               "stisljivost":"3 mm",
               "gorljivost":"DA (po EN 13501-1)",
               "upogibna_trdnost":"139 kPa"
           }
     }
     */
    async createPanelInsulationEntry(ctx, args) {
        console.log('============= START : createPanelInsulationEntry ===========');
        console.log('##### createPanelInsulationEntry arguments: ' + JSON.stringify(args));

        // args is passed as a JSON string
        let json = JSON.parse(args);
        let key = 'pInsulation' + json['serial_num'];
        json['entryType'] = 'pInsulation';

        console.log('##### createPanelInsulationEntry payload: ' + JSON.stringify(json));

        // Check if the entry already exists
        let entryQuery = await ctx.stub.getState(key);
        if (entryQuery.toString()) {
            throw new Error('##### createPanelInsulationEntry - This entry already exists: ' + json['mac']);
        }

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(json)));

        // The transaction ID for the current chaincode invocation request. The transaction ID uniquely identifies the transaction within the scope of the channel.
        let txId = await ctx.stub.getTxID();

        let returnObj = {
            txId: txId
        }

        console.log('============= END : createPanelInsulationEntry ===========');
        return JSON.stringify(returnObj);

    }

    /**
     * Retrieves a specific panel insulation entry
     *
     * @param {*} ctx
     * @param {*} args
     */
    async queryPanelInsulationEntry(ctx, args) {
        console.log('============= START : queryPanelInsulationEntry ===========');
        console.log('##### queryPanelInsulationEntry arguments: ' + JSON.stringify(args));

        // args is passed as a JSON string
        let json = JSON.parse(args);
        let key = 'pInsulation' + json['serial_num'];
        console.log('##### queryPanelInsulationEntry key: ' + key);

        return queryByKey(ctx.stub, key);
    }

    /**
     * Update panel insulation data for specific entry
     * @param ctx
     * @param args
     */
    async updatePanelInsulationEntry(ctx, args) {
        console.log('============= START : updatePanelInsulationEntry ===========');
        console.log('##### updatePanelInsulationEntry arguments: ' + JSON.stringify(args));

        // args is passed as a JSON string
        let json = JSON.parse(args);
        let newData = json['data'];
        let newUserName = json['userInfo']['userName'];
        let newOrg = json['userInfo']['organization'];
        let newUserId = json['userInfo']['userId'];
        let key = 'pInsulation' + json['serial_num'];

        const panelEntry = await queryByKey(ctx.stub, key); // get the key from chaincode state
        if (!panelEntry || panelEntry.length === 0) {
            throw new Error(`${key} does not exist`);
        }
        const entry = JSON.parse(panelEntry.toString());
        entry.data = newData;
        entry.userInfo.userId = newUserId;
        entry.userInfo.userName = newUserName;
        entry.userInfo.organization = newOrg;

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(entry)));

        // The transaction ID for the current chaincode invocation request. The transaction ID uniquely identifies the transaction within the scope of the channel.
        let txId = await ctx.stub.getTxID();

        let returnObj = {
            txId: txId
        }

        console.info('============= END : updatePanelInsulationEntry ===========');
        return JSON.stringify(returnObj);

    }

    /**
     * Retrieves all panel insulation entries
     *
     * @param {*} ctx
     * @param {*} args
     */
    async queryPanelInsulationEntries(ctx, args) {
        console.log('============= START : queryPanelInsulationEntries ===========');
        console.log('##### queryPanelInsulationEntries arguments: ' + JSON.stringify(args));

        let queryString = '{"selector": {"entryType": "pInsulation"}}';
        return queryByString(ctx.stub, queryString);
    }

    /************************************************************************************************
     *
     * Blockchain related functions
     *
     ************************************************************************************************/

    /**
     * Retrieves the Fabric block and transaction details for a key
     *
     * @param {*} ctx
     * @param {*} args - JSON as follows:
     * [
     *    {
     *       "entryType":"sensor",
     *       "key":"1771ADEADBEEZ"
     *    }
     * ]
     *
     */
    async queryHistoryForKey(ctx, args) {
        console.log('============= START : queryHistoryForKey ===========');
        console.log('##### queryHistoryForKey arguments: ' + JSON.stringify(args));

        // args is passed as a JSON string
        let json = JSON.parse(args);
        let key = json['key'];
        let entryType = json['entryType']

        // args is passed as a JSON string
        let historyIterator = await ctx.stub.getHistoryForKey(entryType + key);
        console.log('##### queryHistoryForKey historyIterator: ' + util.inspect(historyIterator));
        let history = [];
        while (true) {
            let historyRecord = await historyIterator.next();
            console.log('##### queryHistoryForKey historyRecord: ' + util.inspect(historyRecord));
            if (historyRecord.value && historyRecord.value.value.toString()) {
                let jsonRes = {};
                console.log('##### queryHistoryForKey historyRecord.value.value: ' + historyRecord.value.value.toString('utf8'));
                // The transaction ID for the current chaincode invocation request. The transaction ID uniquely identifies the transaction within the scope of the channel.
                jsonRes.TxId = historyRecord.value.txId;
                jsonRes.Timestamp = historyRecord.value.timestamp;
                // jsonRes.IsDelete = historyRecord.value.is_delete.toString();
                console.log('##### queryHistoryForKey jsonRes: ' + jsonRes);
                console.log('##### queryHistoryForKey jsonRes: ' + jsonRes.toString());
                try {
                    jsonRes.Record = JSON.parse(historyRecord.value.value.toString('utf8'));
                } catch (err) {
                    console.log('##### queryHistoryForKey error: ' + err);
                    jsonRes.Record = historyRecord.value.value.toString('utf8');
                }
                console.log('##### queryHistoryForKey json: ' + util.inspect(jsonRes));
                history.push(jsonRes);
            }
            if (historyRecord.done) {
                await historyIterator.close();
                console.log('##### queryHistoryForKey all results: ' + JSON.stringify(history));
                console.log('============= END : queryHistoryForKey ===========');
                return JSON.stringify(history);
            }
        }
    }

}

module.exports = Aipan;

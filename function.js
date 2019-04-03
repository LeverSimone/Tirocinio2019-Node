const GLOBAL_SETTINGS = require("./global_settings.js");
const fetch = require("node-fetch");

function post(object, url, type) {
    return fetch(url, {
        method: 'post',
        headers: {
            'Content-Type': type,
            'Accept': 'application/json',
        },
        body: JSON.stringify(object)
    })
}

function get(url) {
    return fetch(url);
}

async function openSite(action) {
    let structureBotify = [];
    let objToPuppetteer = { site: action };

    try {
        let result = await post(objToPuppetteer, GLOBAL_SETTINGS.DESTINATION_URL_PUPPETEER + "/opensite", 'application/json');
        structureBotify = await result.json();

        return structureBotify;
    } catch (error) {
        let object = { error: error }
        console.log(error);
        return (object)
    }
}

async function takeConfID(site) {
    //controlliamo se il server Python conosce già il sito, in caso recuperiamo il conf_id
    try {
        site = encodeURIComponent(site);
        let result = await get(GLOBAL_SETTINGS.DESTINATION_URL_RASA + '/site?site=' + site);
        let conf_id = await result.json();

        return conf_id
    } catch (error) {
        let object = { error: error }
        console.log(error);
        return (object)
    }
}

async function configureValidator(structureBotify) {
    //chiediamo a Rasa di imparare la struttura del sito
    try {
        let result = await post(structureBotify, GLOBAL_SETTINGS.DESTINATION_URL_RASA + "/configure", 'application/json');
        let configurationURI = await result.json();

        return configurationURI;

    } catch (error) {
        let object = { error: error }
        console.log(error);
        return (object)
    }
}

async function askToValide(comand, configurationURI) {
    //chiediamo a Rasa di fare Validation
    try {
        configurationURI = encodeURIComponent(configurationURI);
        let result = await get(GLOBAL_SETTINGS.DESTINATION_URL_RASA + '/parse?q=' + comand + '&conf=' + configurationURI);
        let validation = await result.json();

        return validation

    } catch (error) {
        let object = { error: error }
        console.log(error);
        return (object)
    }
}

function objToRun(validation, link) {
    if (!validation.matching_failed[0] && validation.matching[0]) {
        let object = {
            url: link,
            component: validation.matching[0].match.component,
            query: {
                intent: validation.intent.name,
                resource: {
                    name: null,
                    selector: null,
                    param_attr: {
                        name: null,
                        selector: null
                    },
                    operation: null,
                    attributes: []
                }
            }
        };
        //prendo operation
        validation.entities.forEach(entities => {
            if(entities.entity.includes("op")) {    
                object.query.resource.operation = entities.value;
            }
        });
        //prendo resource e attributes dall'oggetto
        validation.matching.forEach(entities => {
            //console.log("entities");
            //console.log(entities);
            if (entities.entity.entity == "resource") {
                object.query.resource.name = entities.match.resource;
                object.query.resource.selector = entities.match.selector;
                //inserisco tutti gli attributes compatibili con la risorsa inserita
                entities.match.attributes.forEach(attributes => {
                    object.query.resource.attributes.push({name: attributes.name, selector: attributes.selector});
                });
            } //inserisco gli attributes indicati dall'utente
            else if (entities.entity.entity == "attribute") {
                object.query.resource.param_attr = entities.match;
            }
        });
        return object;
    }
    else
        return false;
}

function newObjToRun(validation, link) {
    if (!validation.matching_failed[0] && validation.matching[0]) {
        let object = {
            url: link,
            component: validation.matching[0].match.component,
            query: {
                intent: validation.intent.name,
                parameters: [], //ex: {name : "attribute", value : "stars"}
                resource: {
                    name: null,
                    selector: null,
                    attributes: []
                }
            }
        };
        //prendo operation e attr-value (ex: carlos)
        validation.entities.forEach(entities => {
            if(entities.entity.includes("op") || entities.entity == "attr-value") {    
                object.query.parameters.push({name: entities.entity, value: entities.value});
            }
        });
        //prendo resource e attributes dall'oggetto
        validation.matching.forEach(entities => {
            if (entities.entity.entity == "resource") {
                object.query.resource.name = entities.match.resource;
                object.query.resource.selector = entities.match.selector;
                //inserisco tutti gli attributes compatibili con la risorsa inserita
                entities.match.attributes.forEach(attributes => {
                    object.query.resource.attributes.push({name: attributes.name, selector: attributes.selector});
                });
            } //inserisco gli attributes indicati dall'utente
            else if (entities.entity.entity == "attribute") {
                object.query.parameters.push({name: "attribute", value: entities.match.name});
            }
        });
        return object;
    }
    else
        return false;
}

function validator(validation) {
    found = { match: { intent: validation.intent.name, resources: [], attributes: [] }, not_matched: { resources: [], attributes: [] } }
    //metti in found un oggetto di tipo resources/attributes e il suo valore
    validation.matching.forEach(entities => {
        if (entities.relation == 'equal') {
            entities.entity.entity == 'resource' ? found.match.resources.push(entities.entity.value) : found.match.attributes.push(entities.entity.value);
        }
        else if (entities.relation == 'syn') {
            entities.entity.entity == 'resource' ? found.match.resources.push(entities.match.resource) : found.match.attributes.push(entities.match);
        }
        else {
            let object = { relation: entities.relation, insert: entities.entity.value };
            if (entities.entity.entity == 'resource') {
                object.found = entities.match.resource;
                found.match.resources.push(object);
            } else {
                object.found = entities.match;
                found.match.attributes.push(object);
            }
        }
    });
    validation.matching_failed.forEach(entities => {
        entities.entity == 'resource' ? found.not_matched.resources.push(entities.value) : found.not_matched.attributes.push(entities.value);
    });

    return found;
}

function composeResult(objectValidated) {
    let resultToSend = "";
    if (objectValidated.match) {
        resultToSend = "Intent recognised: " + objectValidated.match.intent;
        resultToSend = writeResult(resultToSend, objectValidated.match.resources, 'resource', true)
        resultToSend = writeResult(resultToSend, objectValidated.match.attributes, 'attribute', true)
    }
    if (objectValidated.not_matched) {
        resultToSend = writeResult(resultToSend, objectValidated.not_matched.resources, 'resource', false)
        resultToSend = writeResult(resultToSend, objectValidated.not_matched.attributes, 'attribute', false)
    }
    return resultToSend;
}

function writeResult(resultToSend, object, resAtt, match) {
    object.forEach(element => {
        if (element.relation) {
            if (match)
                resultToSend += ", " + resAtt + " insert: " + element.insert + ", " + resAtt + " relation: " + element.relation + ", " + resAtt + " found: " + element.found;
        } else {
            if (match) {
                resultToSend += ", " + resAtt + ": " + element;
            } else {
                resultToSend += ", " + resAtt + " not found: " + element;
            }
        }
    });
    return resultToSend;
}

module.exports = { configureValidator, openSite, askToValide, validator, composeResult, takeConfID, objToRun, newObjToRun};
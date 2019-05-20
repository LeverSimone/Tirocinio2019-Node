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

function newObjToRun(validation, link) {
    let object;
    if (!validation.matching_failed[0] && validation.matching[0]) {
        object = {
            url: link,
            component: validation.matching[0].match.component,
            query: {
                intent: validation.intent.name,
                parameters: [], //ex: {name : "attribute", value : "stars"}
                resource: {
                    name: null,
                    category: null,
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
                object.query.resource.category = entities.match.category;
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
        //setto che tutto è andato a buon fine
        object.result='true';
        return object;
    } else if (validation.dissambiguate && validation.dissambiguate.category[0]) {
        //Bisogna fare dissambiguation
        object = validation.dissambiguate;
        object.result='dissambiguation';
        return object
    }
    else {
        //setto che il Matching è fallito
        object = validation.matching_failed;
        object.result='false'
        return object;
    }
}

module.exports = {post, configureValidator, openSite, askToValide, takeConfID, newObjToRun};
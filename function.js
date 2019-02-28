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

async function openSite(req, action) {
    let structureBotify = [];
    let objToPuppetteer = { site: action };

    try {
        let result = await post(objToPuppetteer, GLOBAL_SETTINGS.DESTINATION_URL_PUPPETEER + "/opensite", 'application/json');
        structureBotify = await result.json();

        //salvo in sessione la struttura del sito
        req.session.context = undefined;
        req.session.site = structureBotify;

        let resultToSend = { action: "Site opened: " + action };
        return resultToSend;
    } catch (error) {
        console.log(error);
        return ({ error: error })
    }
}

async function askRasa(action) {
    let objectForRasa = { q: action, project: "components" };

    //chiediamo a Rasa di restituire intent, resources
    try {
        let reqRasa = await post(objectForRasa, GLOBAL_SETTINGS.DESTINATION_URL_RASA + "/parse", 'application/x-yml');
        let resRasa = await reqRasa.json();
        let intentRasa = { intent: resRasa.intent.name }
        for (let i = 0; i < resRasa.entities.length; i++) {
            intentRasa[resRasa.entities[i].entity] = resRasa.entities[i].value;
        }

        //Debugging Frontend
        intentRasa.log = resRasa;

        return intentRasa;

    } catch (error) {
        console.log(error);
        return ({ error: error })
    }
}

function validator(structureBotify, intentRasa, req) {
    let intentFound = 0;
    let resourceFound = false;
    let attributeFound = false;
    let oneIntentResource = null;

    //prendo il componente correlato all'intent di Rasa
    let up = intentRasa.intent.indexOf("_");
    let intent = intentRasa.intent.substr(0, up);

    //controllo se si può applicare l'intent voluto su un componente e sulla resource chiesta 
    for (let i = 0; i < structureBotify.length; i++) {
        if (structureBotify[i].intent == intent) {
            intentFound++;
            oneIntentResource = structureBotify[i].resource;

            if (structureBotify[i].resource === intentRasa.resource && intentRasa.resource) {
                resourceFound = true;
                for (let j = 0; j < structureBotify[i].attribute.length; j++) {
                    if (structureBotify[i].attribute[j] == intentRasa.attribute) {
                        attributeFound = true;
                    }
                }
            }
        }
    }

    //se ho trovato solo un component sul quale applicare un determinato intent, la resource dell'utente non è necessaria
    if (intentFound == 1 && !intentRasa.resource) {
        intentRasa.resource = oneIntentResource;
        resourceFound = true;
    }

    //Send result
    //console.log("intentFound: " + intentFound + " resourceFound: " + resourceFound);
    if (!intentFound) {
        //Non si può applicare l'intent voluto nel sito
        return "There are not " + intent + " in this site";
    } else if (intentFound && !resourceFound) {
        if (!intentRasa.resource) {
            //ci sono multipli component e non si ha indicato una resource su cui si vuole lavorare
            return "There are multiple resources in this site. You have to write a resource with you want to work";
        }
        else {
            //Indicata una risorsa che non è presente nel sito, elimino anche la risorsa dalla sessione
            req.session.context = undefined;
            return "There are not " + intentRasa.resource + " in this site";
        }
    } else {
        if(!attributeFound && intentRasa.attribute) {
            return "Intent recognised: " + intentRasa.intent + ", resource: " + intentRasa.resource + ", but " + intentRasa.attribute + " not exist in this site";
        } else {
            return "Intent recognised: " + intentRasa.intent + ", resource: " + intentRasa.resource + ", attribute: " + intentRasa.attribute;
        }
    }
}

module.exports = { post, askRasa, openSite, validator };
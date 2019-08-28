const DATA = require("../data.js");
const engine = require('conweb-engine/components/engine');

function form_go(chatId, req, validation, configurationURI) {
    let resultToSend;
    DATA.clearSession(chatId, req);
    let objToEngine = objFormToRun(validation, configurationURI);

    if (objToEngine.result == 'false') {
        //inserito qualcosa che non esiste nel sito
        resultToSend = { action: 'You insert' };
        let wordNotFound = "";
        for (let i = 0; i < objToEngine.length; i++) {
            wordNotFound += objToEngine[i].value + ", "
        }
        if (wordNotFound == "")
            resultToSend.action += " words that are not in the site";
        else
            resultToSend.action += ": \"" + wordNotFound + "\" but this word is not in the site";
        //Debugging Frontend
        resultToSend.log = JSON.stringify(validation, null, " ");
    } else if (objToEngine.result == 'notCompatible') {
        //l'intent non e' compatibile con i componenti del sito
        resultToSend = { action: 'In this site you can\'t ' + objToEngine.intent.substr(0, objToEngine.intent.indexOf('_')) };
    } else {
        //tutto è andato a buon fine
        //resultToSend = { action: objToEngine }

        //let resultComplete = await engine.processIntent(objToEngine);
        //resultToSend = { action: resultComplete }

        DATA.setSession(chatId, "form", req, "component");
        DATA.setSession(chatId, "0", req, "indexForm");
        DATA.setSession(chatId, objToEngine, req, "lastResult");

        let text = objToEngine.query.resource.name + " form opened.\nInsert " + objToEngine.query.resource.attributes[0].name + ":";
        resultToSend = { action: text }
        resultToSend.log = JSON.stringify(objToEngine, null, " ");

        resultToSend.format = "false";
    }

    return resultToSend;
}

async function form_continue(chatId, req, insertedValue) {
    let resultToSend;
    let indexForm = parseInt(DATA.getIndexForm(chatId, req), 10);
    let objToEngine = DATA.getLastResult(chatId, req);

    console.log(objToEngine.query.resource.attributes);
    console.log("indexForm")
    console.log(indexForm)
    console.log("objToEngine.query.resource.attributes[indexForm]");
    console.log(objToEngine.query.resource.attributes[indexForm]);

    //fine form
    if (indexForm == 10000) {
        if (insertedValue == "yes" || insertedValue == "Yes") {
            let resultComplete = await engine.processIntent(objToEngine);
            resultToSend = { action: resultComplete }
            resultToSend.firsText = "Submit done";
            DATA.clearSession(chatId, req);
            //ricevere nuovo link da conweb-engine e aprire pagina
        } else {
            resultToSend = { action: "Submit canceled" };
            DATA.clearSession(chatId, req);
        }
    } else { //inserisce i valori
        objToEngine.query.resource.attributes[indexForm].value = insertedValue;
        indexForm += 1
        DATA.setSession(chatId, indexForm + "", req, "indexForm");

        //controllo se ci sono altri valori da inserire
        if (objToEngine.query.resource.attributes[indexForm]) {
            let text = "Insert " + objToEngine.query.resource.attributes[indexForm].name + ":";
            resultToSend = { action: text }
        } else if (indexForm < 10000) {
            resultToSend = { action: "Do you want to submit? yes or no" };
            DATA.setSession(chatId, "10000", req, "indexForm");
        }
    }

    resultToSend.format = "false";
    return resultToSend;
}

function objFormToRun(validation, link) {
    let object;
    if (validation.intentNotCompatible) {
        //l'intent non e' compatibile con i componenti del sito
        object = { result: 'notCompatible' };
        object.intent = validation.intentNotCompatible
        return object;
    }

    if (!validation.matching_failed[0] && validation.matching[0]) {
        object = {
            url: link,
            component: validation.matching[0].match.component,
            query: {
                intent: "fill_form",
                resource: {
                    type: null,
                    selector: null,
                    attributes: []
                }
            }
        };
        //prendo resource e attributes dall'oggetto
        validation.matching.forEach(entities => {
            if (entities.entity.entity == "type") {
                object.query.resource.name = entities.match.resource;
                object.query.resource.selector = entities.match.selector;
                object.query.resource.type = entities.match.resource;
                //inserisco tutti gli attributes compatibili con la risorsa inserita
                entities.match.attributes.forEach(attributes => {
                    object.query.resource.attributes.push({ name: attributes.name, selector: attributes.selector, type: attributes.type, value: null });
                });
            }
        });
        //setto che tutto è andato a buon fine
        object.result = 'true';
        console.log(object)
        return object;
    } else {
        //setto che il Matching è fallito
        object = validation.matching_failed;
        object.result = 'false'
        return object;
    }
}

module.exports = { form_go, form_continue };
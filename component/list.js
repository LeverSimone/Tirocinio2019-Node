const engine = require('conweb-engine/components/engine');

const DATA = require("../data.js");
const OPENSITE = require("../opensite.js");
const MY_FUNCTIONS = require("../function.js");

function show_more(chatId, req, nResult) {
    let resultToSend;
    if (DATA.getExistResult(chatId, req)) {
        resultToSend = { action: null };
        resultToSend.action = DATA.getResult(chatId, req, nResult);
        resultToSend.format = "true";
    } else {
        resultToSend = { action: "You can't \"show more\" in this moment" };
        resultToSend.format = "false";
    }
    return resultToSend;
}

async function open_element(chatId, req, validation) {
    let resultToSend;
    if (validation.position) {
        let position = validation.position - 1;
        //salva la lista di news trovate e guarda se nella posizione esiste bot-attribute:link
        let lastList = DATA.getLastResult(chatId, req);
        if (position >= 0 && position < lastList.length && lastList[position].link) {
            //link founded, go to open it
            //save the old link
            let lastLink = DATA.getURI(chatId, req);
            DATA.setSession(chatId, lastLink, req, "lastURI");
            resultToSend = await OPENSITE.openSite(lastList[position].link, req, chatId);
            resultToSend.format = "false";
        } else {
            resultToSend = { action: "You can't open this element" };
            resultToSend.format = "false";
        }
    } else {
        resultToSend = { action: "I don't understand what element you want to open" };
        resultToSend.format = "false";
    }
    return resultToSend;
}

async function list_intent(chatId, req, validation, configurationURI, nResult) {
    let resultToSend;

    DATA.clearSession(chatId, req);
    let objToEngine = MY_FUNCTIONS.ObjListToRun(validation, configurationURI);

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
    } else if (objToEngine.result == 'dissambiguation') {
        //esitono più componenti con la resource inserita dell'utente
        resultToSend = { action: 'In this site there are many ' + objToEngine.resource + ". Write the same action with one of these words: " };
        for (let i = 0; i < objToEngine.category.length - 1; i++) {
            resultToSend.action += objToEngine.category[i] + ", ";
        }
        resultToSend.action += objToEngine.category[objToEngine.category.length - 1];
        resultToSend.log = JSON.stringify(objToEngine, null, " ");
        resultToSend.action += ". For example write: \"list \"" + objToEngine.category[0];
    } else if (objToEngine.result == 'notCompatible') {
        //l'intent non e' compatibile con i componenti del sito
        resultToSend = { action: 'In this site you can\'t ' + objToEngine.intent.substr(0, objToEngine.intent.indexOf('_')) };
    } else {
        //tutto è andato a buon fine
        DATA.setSession(chatId, objToEngine.query.resource.name, req, "resource");
        let resultComplete = await engine.processIntent(objToEngine);
        let result = resultComplete.splice(0, nResult);
        DATA.setSession(chatId, resultComplete, req, "result");
        DATA.setSession(chatId, result, req, "lastResult");
        resultToSend = { action: result };
        //Debugging Frontend
        resultToSend.log = JSON.stringify(objToEngine, null, " ");
        //format indica che l'output per Telegram è da formattare
        if (objToEngine.query.intent == 'list_about' || objToEngine.query.intent == "list_count")
            resultToSend.format = objToEngine.query.intent;
        else
            resultToSend.format = "true";
        
        resultToSend.firsText = "These are " + resultToSend.action.length + " " + objToEngine.query.resource.name + "\n\n";
        if (DATA.getLengthResult(chatId, req))
        {
            resultToSend.otherText = "Do you want to know more? Write \"show more\"\nDo you want to open an element? Write for example: \"open element 2\"";
        }
    }

    return resultToSend;
}

module.exports = { show_more, open_element, list_intent };
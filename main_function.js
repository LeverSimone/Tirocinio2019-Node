const engine = require('conweb-engine/components/engine');

const DATA = require("./data.js");
const MY_FUNCTIONS = require("./function.js");
const OPENSITE = require("./opensite.js");
const LIST = require("./component/list.js");
const ARTICLE = require("./component/article.js");

//numero di risultati da ritornare
const nResult = 5;

async function conversation(body, req, chatId) {
    if (body.action) {
        //L'azione inserita è un sito
        if (body.action.includes('http')) {
            let resultToSend = await OPENSITE.openSite(body.action, req, chatId);
            return resultToSend;
        }
        //è un'altro tipo di azione, un comando, ex: "list me proposals", chiamo Rasa per fare la validazione
        else if (DATA.getURI(chatId, req)) {
            let configurationURI = DATA.getURI(chatId, req);
            let objectRasaURI = DATA.getRasaURI(chatId, req);

            //chiamo il server Rasa per fare la validazione dell'input utente
            let validation = await MY_FUNCTIONS.askToValide(body.action, objectRasaURI);

            if (validation.error) {
                return { action: validation.error, error: 500 };
            }
            else {
                console.log(validation);
                let resultToSend;
                // non è un'azione di tipo lista, e' show more
                if (validation.intent && validation.intent.name == "show_more") {
                    resultToSend = LIST.show_more(chatId, req, nResult);
                } else if (validation.intent && validation.intent.name == "article_read") {
                    resultToSend = ARTICLE.article_read();
                } else if (validation.intent && validation.intent.name == "open_element") {
                    resultToSend = await LIST.open_element(chatId, req, validation);
                } else {
                    // è un'azione di tipo lista
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
                    }
                }
                return resultToSend;
            }
        }
        else {
            return { action: "You have to open a site before doing an action" };
        }
    }
    else {
        return { action: "Action is empty'", error: 400 };
    }
}

module.exports = { conversation };
const DATA = require("./data.js");
const MY_FUNCTIONS = require("./function.js");
const OPENSITE = require("./opensite.js");
const LIST = require("./component/list.js");
const ARTICLE = require("./component/article.js");
const COMMANDS = require("./component/commands.js");
const GLOBAL_SETTINGS = require("./global_settings.js");

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
                let resultToSend;
                // non è un'azione di tipo lista, e' show more
                if (validation.intent && validation.intent.name == "show_more") {
                    resultToSend = LIST.show_more(chatId, req, GLOBAL_SETTINGS.NRESULT);
                } else if (validation.intent && validation.intent.name == "article_read") {
                    resultToSend = ARTICLE.article_read();
                } else if (validation.intent && validation.intent.name == "open_element") {
                    resultToSend = await LIST.open_element(chatId, req, validation);
                } else if (validation.intent && validation.intent.name == "go_back") {
                    resultToSend = await COMMANDS.go_back(chatId, req);
                }
                else {
                    // è un'azione di tipo lista
                    resultToSend = await LIST.list_intent(chatId, req, validation, configurationURI, GLOBAL_SETTINGS.NRESULT);
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
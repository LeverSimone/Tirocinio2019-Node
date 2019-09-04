const DATA = require("./data.js");
const MY_FUNCTIONS = require("./function.js");
const OPENSITE = require("./opensite.js");
const LIST = require("./component/list.js");
const ARTICLE = require("./component/article.js");
const COMMANDS = require("./component/commands.js");
const FORM = require("./component/form.js");
const GLOBAL_SETTINGS = require("./global_settings.js");

async function conversation(body, req, chatId) {
    if (body.action) {
        let resultToSend = null;
        //L'azione inserita è un sito
        if (body.action.includes('http')) {
            resultToSend = await OPENSITE.openSite(body.action, req, chatId);
            return resultToSend;
        }
        else if (!DATA.getComponent(chatId, req)) {
            //non è già in esecuzione un form

            //è un'altro tipo di azione, un comando, ex: "list me proposals"
            //chiamo il server Rasa per fare la validazione dell'input utente
            let configurationURI = DATA.getURI(chatId, req);
            let objectRasaURI = DATA.getRasaURI(chatId, req);
            let validation = await MY_FUNCTIONS.askToValide(body.action, objectRasaURI);
            if (validation.error) {
                return { action: validation.error, error: 500 };
            }
            if (DATA.getURI(chatId, req) || validation.intent.name == "go_site") {
                // non è un'azione di tipo lista, e' show more
                if (validation.intent && validation.intent.name == "show_more") {
                    resultToSend = LIST.show_more(chatId, req, GLOBAL_SETTINGS.NRESULT);
                } else if (validation.intent && validation.intent.name == "article_read") {
                    resultToSend = ARTICLE.article_read(chatId, req, validation, configurationURI);
                } else if (validation.intent && validation.intent.name == "open_element") {
                    resultToSend = await LIST.open_element(chatId, req, validation);
                } else if (validation.intent && validation.intent.name == "go_back") {
                    resultToSend = await COMMANDS.go_back(chatId, req);
                } else if (validation.intent && validation.intent.name == "go_site") {
                    resultToSend = await COMMANDS.go_site(chatId, req, validation);
                } else if (validation.intent && validation.intent.name == "form_go") {
                    resultToSend = FORM.form_go(chatId, req, validation, configurationURI);
                }
                else {
                    // è un'azione di tipo lista o l'intent non è compatibile
                    resultToSend = await LIST.list_intent(chatId, req, validation, configurationURI, GLOBAL_SETTINGS.NRESULT);
                }
            }
            else {
                return { action: "You have to open a site before doing an action" };
            }
        } else {
            //è già in esecuzione l'inserimento di valori in un form
            resultToSend = await FORM.form_continue(chatId, req, body.action);
            
        }
        return resultToSend;
    }
    else {
        return { action: "Action is empty'", error: 400 };
    }
}

module.exports = { conversation };
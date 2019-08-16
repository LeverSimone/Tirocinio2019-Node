const engine = require('conweb-engine/components/engine');

const DATA = require("./data.js");
const MY_FUNCTIONS = require("./function.js");

//numero di risultati da ritornare
const nResult = 5;

async function openSite(link, req, chatId) {
    let resultToSend = { action: "Site opened: " + link + " \n" };

    //controllo se conosco già il sito
    let config = await MY_FUNCTIONS.takeConf(link);
    if (config.error) {
        return { action: config.error, error: 500 };
    }
    else if (config.site) {
        //sito gia' presente in mongoDB, salvo in sessione e viene modificato resultToSend per scrivere all'utente
        DATA.openSiteData(chatId, req, config);
        resultToSend = MY_FUNCTIONS.createOutputSiteContent(config, resultToSend);
        return resultToSend;
    } else {
        //impariamo la struttura del sito da Botify
        let structureBotify = await MY_FUNCTIONS.openSitePuppeteer(link);
        if (structureBotify.error) {
            return { action: structureBotify.error, error: 500 };
        } else {
            //inserisco il link del sito nella struttura imparata per inviarla a Rasa
            structureBotify._id = link;

            //configuriamo Rasa per sapere la struttura del sito in cui ci troviamo
            let config = await MY_FUNCTIONS.configureValidator(structureBotify);
            if (config.error) {
                return { action: config.error, error: 500 };
            }
            else {
                //salvo in sessione l'URI del sito e modifico resultToSend
                config.site.siteObject = config.site.id;
                DATA.openSiteData(chatId, req, config);
                resultToSend = MY_FUNCTIONS.createOutputSiteContent(config, resultToSend);
                //Debugging Frontend
                resultToSend.log = JSON.stringify(structureBotify, null, " ");

                return resultToSend;
            }
        }
    }
}

async function conversation(body, req, chatId) {
    if (body.action) {
        //L'azione inserita è un sito
        if (body.action.includes('http')) {
            let resultToSend = openSite(body.action, req, chatId);
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
                    if (DATA.getExistResult(chatId, req)) {
                        resultToSend = { action: null };
                        resultToSend.action = DATA.getResult(chatId, req, nResult);
                        resultToSend.format = "true";
                    } else {
                        resultToSend = { action: "You can't \"show more\" in this moment" };
                        resultToSend.format = "false";
                    }
                } else if (validation.intent && validation.intent.name == "article_read") {
                    DATA.clearSession(chatId, req);
                    //creare oggetto da mandare a conweb_engine per eseguire lettura
                    resultToSend = { action: "You can't \"read\" in this moment. This functionality is not complete" };
                    resultToSend.format = "false";
                } else if (validation.intent && validation.intent.name == "open_element") {
                    if (validation.position) {
                        let position = validation.position - 1;
                        //salva la lista di news trovate e guarda se nella posizione esiste bot-attribute:link
                        let lastList = DATA.getLastResult(chatId, req);
                        console.log("position >= 0 && position < lastList.length")
                        console.log(position >= 0 && position < lastList.length)
                        console.log("lastList[position].link")
                        console.log(lastList[position].link)
                        if (position >= 0 && position < lastList.length && lastList[position].link) {
                            //link founded, go to open it
                            resultToSend = openSite(lastList[position].link, req, chatId);
                            resultToSend.format = "false";
                        } else {
                            resultToSend = { action: "You can't open this element" };
                            resultToSend.format = "false";
                        }
                    } else {
                        resultToSend = { action: "I don't understand what element you want to open" };
                        resultToSend.format = "false";
                    }
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

module.exports = { openSite, conversation };
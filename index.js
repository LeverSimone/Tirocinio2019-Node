const express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
const engine = require('conweb-engine/components/engine');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: {}
}));

const GLOBAL_SETTINGS = require("./global_settings.js");
const MY_FUNCTIONS = require("./function.js");
const DATA = require("./data.js");

//numero di risultati da ritornare
const nResult = 5;

app.use('/', express.static('public'));

app.use('/examples/', express.static('examples'));

app.get('/', (req, res) => {
    res.json({ status: 'ok' });
})

//salva il link del sito in sessione e crea una risposta contente gli elementi del sito con le sue resource
function openSiteResult(chatId, config, req, resultToSend) {
    DATA.setSession(chatId, config.site.id, req, "site");
    DATA.setSession(chatId, config.site.siteObject, req, "objectLink");
    console.log(req.session.configurationURI)
    console.log(req.session.objectRasaURI)
    DATA.clearSession(chatId, req);
    let resourceFound = "false";

    resultToSend.action += "In this site there are: \n";
    config.site.comp_res.forEach((comp_res) => {
        if (comp_res.component) {
            if (comp_res.component == "list")
                resourceFound = comp_res.resources[0];
            resultToSend.action += comp_res.component;
            if (comp_res.resources.length > 0) {
                resultToSend.action += " about: "
                comp_res.resources.forEach((resource) => {
                    if (resource)
                        resultToSend.action += resource + " ";
                })
            }
        }
        resultToSend.action += "\n";
    })
    if (resourceFound != "false")
        resultToSend.action += "To interact with the site write an action like \"list " + resourceFound + "\"";
}

async function openSite(link, req, chatId) {
    let resultToSend = { action: "Site opened: " + link + " \n" };

    //controllo se conosco già il sito
    let config = await MY_FUNCTIONS.takeConf(link);
    if (config.error) {
        return { action: config.error, error: 500 };
    }
    else if (config.site) {
        //sito gia' presente in mongoDB, salvo in sessione e viene modificato resultToSend per scrivere all'utente
        openSiteResult(chatId, config, req, resultToSend);
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
                openSiteResult(chatId, config, req, resultToSend);
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
                if (validation.intent.name == "show_more") {
                    if (DATA.getExistResult(chatId, req)) {
                        resultToSend = { action: null };
                        resultToSend.action = DATA.getResult(chatId, req, nResult);
                        resultToSend.format = "true";
                    } else {
                        resultToSend = { action: "You can't \"show more\" in this moment" };
                        resultToSend.format = "false";
                    }
                } else if (validation.intent.name == "article_read") {
                    DATA.clearSession(chatId, req);
                    //creare oggetto da mandare a conweb_engine per eseguire lettura
                    resultToSend = { action: "You can't \"read\" in this moment. This functionality is not complete" };
                    resultToSend.format = "false";
                } else if (validation.intent.name == "open_element") {
                    if (validation.position) {
                        let position = validation.position - 1;
                        //salva la lista di news trovate e guarda se nella posizione esiste bot-attribute:link
                        let lastList = DATA.getLastResult(chatId, req);
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
                    let objToEngine = MY_FUNCTIONS.newObjToRun(validation, configurationURI);

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
                        return resultToSend;
                    } else if (objToEngine.result == 'dissambiguation') {
                        //esitono più componenti con la resource inserita dell'utente
                        resultToSend = { action: 'In this site there are many ' + objToEngine.resource + ". Write the same action with one of these words: " };
                        for (let i = 0; i < objToEngine.category.length - 1; i++) {
                            resultToSend.action += objToEngine.category[i] + ", ";
                        }
                        resultToSend.action += objToEngine.category[objToEngine.category.length - 1];
                        resultToSend.log = JSON.stringify(objToEngine, null, " ");
                        return resultToSend;
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

//Conversation per Telegram
app.post('/', async (req, res) => {
    //console.log("req.body");
    //console.log(req.body);
    let chatId;
    let sentMessage;
    if (req.body.message) {
        chatId = req.body.message.chat.id;
        sentMessage = req.body.message.text;
    } else if (req.body.edited_message) {
        chatId = req.body.edited_message.chat.id;
        sentMessage = req.body.edited_message.text;
    }

    if (sentMessage == '/start') {

        let object = { chat_id: chatId, text: 'Open a site with an URL and then write an action' };
        let responseBot = await MY_FUNCTIONS.post(object, GLOBAL_SETTINGS.TELEGRAM_BOT_URL, 'application/json');
        res.sendStatus(200);

    } else {
        let body = { action: sentMessage };
        let resultToSend = await conversation(body, req, chatId);

        if (resultToSend.error) {
            res.status(resultToSend.error).send(resultToSend.action);
        } else {
            let object = { chat_id: chatId, text: resultToSend.action, parse_mode: "HTML" };
            //Format output for Telegram in case the user do an action. ex: list cat
            if (resultToSend.action.length == 0) {
                object.text = "This list is empty";
            }
            else if (resultToSend.format == "true") {
                resource = DATA.getResource(chatId, req);
                object.text = "These are " + resultToSend.action.length + " " + resource + "\n\n";

                for (let i = 0; i < resultToSend.action.length; i++) {
                    if (resultToSend.action[i].title || resultToSend.action[i].key) {
                        let temp = resultToSend.action[i].title ? resultToSend.action[i].title : resultToSend.action[i].key;
                        let titleNoSpace = temp.replace(/\n/g, '')
                        object.text += "<b>" + titleNoSpace + "</b>\n"
                    }
                    for (var key in resultToSend.action[i]) {
                        if (resultToSend.action[i].hasOwnProperty(key) && key != "title" && key != "key" && resultToSend.action[i][key]) {
                            object.text += key + ": " + resultToSend.action[i][key] + "\n";
                        }
                    }
                    object.text += "\n";
                }

                if (resultTelegram[chatId].length != 0)
                    object.text += "Do you want to know more? Write \"show more\"\nDo you want to open an element? Write for example: \"open element 2\"";

            } else if (resultToSend.format == "list_about") {
                object.text = "";
                for (let i = 0; i < resultToSend.action.length; i++) {
                    object.text += resultToSend.action[i];
                    object.text += "\n";
                }
            }
            let responseBot = await MY_FUNCTIONS.post(object, GLOBAL_SETTINGS.TELEGRAM_BOT_URL, 'application/json');
            let responseBotJson = await responseBot.json();

            if (responseBotJson.ok == false) {
                object.text = "Error"
                responseBot = await MY_FUNCTIONS.post(object, GLOBAL_SETTINGS.TELEGRAM_BOT_URL, 'application/json');
                res.sendStatus(200);
            } else {
                res.sendStatus(200);
            }
        }
    }
});

app.post('/conversation', async (req, res) => {
    let body = req.body;
    let resultToSend = await conversation(body, req);

    if (resultToSend.error) {
        res.status(resultToSend.error).send(resultToSend.action);
    } else {
        resultToSend.action = JSON.stringify(resultToSend.action, null, " ")
        res.json(resultToSend);
    }
})

app.post('/helloname', async (req, res) => {
    let input = req.body;
    if (input.phrase) {
        let object = { q: input.phrase, project: "helloname" };
        try {
            let result = await MY_FUNCTIONS.post(object, GLOBAL_SETTINGS.DESTINATION_URL_RASA + "/parse", 'application/x-yml');
            let resultjson = await result.json();
            //console.log(resultjson);
            let resToSend = { intent: resultjson.intent.name }
            if (resultjson.entities[0])
                resToSend.entity = resultjson.entities[0].value;
            res.json(resToSend);
        } catch (error) {
            res.status(500).send(error);
        }
    }
    else {
        res.sendStatus(400);
    }
})

app.listen(GLOBAL_SETTINGS.PORT, () => console.log('Example app listening on port ' + GLOBAL_SETTINGS.PORT))
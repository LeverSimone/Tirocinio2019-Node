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

//Array in memory per mantenere l'associazione tra la chat e il sito di cui si sta parlando
var siteTelegram = [];

app.use('/', express.static('public'));

app.use('/examples/', express.static('examples'));

app.get('/', (req, res) => {
    res.json({ status: 'ok' });
})

//Settare contenuto per la sessione API standard e per l'array in memory per Telegram
function setSession(chatId, valueToSet, req) {
    if (chatId) {
        siteTelegram[chatId] = valueToSet;
    } else {
        req.session.configurationURI = valueToSet;
    }
}

async function conversation(body, req, chatId) {
    if (body.action) {
        //L'azione inserita è un sito
        if (body.action.includes('http')) {
            let resultToSend = { action: "Site opened: " + body.action };

            //resetto session context
            //req.session.context = undefined;

            let configurationURI = await MY_FUNCTIONS.takeConfID(body.action);
            if (configurationURI.error) {
                return { action: configurationURI.error, error: 500 };
            }
            else if (configurationURI.id) {
                setSession(chatId, configurationURI.id, req);
                return resultToSend;
            } else {

                //impariamo la struttura del sito da Botify
                let structureBotify = await MY_FUNCTIONS.openSite(body.action);
                if (structureBotify.error) {
                    return { action: structureBotify.error, error: 500 };
                } else {
                    //inserisco il link del sito nella struttura imparata
                    structureBotify._id = body.action;

                    //configuriamo Rasa per sapere la struttura del sito in cui ci troviamo
                    configurationURI = await MY_FUNCTIONS.configureValidator(structureBotify);
                    if (configurationURI.error) {
                        return { action: configurationURI.error, error: 500 };
                    }
                    else {
                        //salvo in sessione configurationURI
                        setSession(chatId, configurationURI.id, req);

                        //Debugging Frontend
                        resultToSend.log = JSON.stringify(structureBotify, null, " ");

                        return resultToSend;
                    }
                }
            }
        }
        //è un'altro tipo di azione, un comando, ex: "list me proposals", chiamo Rasa per fare la validazione
        else if (req.session.configurationURI || siteTelegram[chatId]) {

            let configurationURI = req.session.configurationURI ? req.session.configurationURI : siteTelegram[chatId];

            //chiamo il server Rasa per fare la validazione dell'input utente
            let validation = await MY_FUNCTIONS.askToValide(body.action, configurationURI);

            if (validation.error) {
                return { action: validation.error, error: 500 };
            }
            else {
                let objToEngine = MY_FUNCTIONS.newObjToRun(validation, configurationURI);

                //inserisci da context, da implementare nella parte di Python
                /*
                //ricordo contesto
                if (!objectValidated.match.resources[0] && !objectValidated.not_matched.resources[0] && req.session.context) {
                    objectValidated.match.resources.push(req.session.context);
                } else {
                    req.session.context = objectValidated.match.resources[0]
                }*/

                let resultToSend;
                if (objToEngine.result == 'false') {
                    resultToSend = { action: 'You insert: ' };
                    for (let i = 0; i < objToEngine.length; i++) {
                        resultToSend.action += objToEngine[i].value + ", "
                    }
                    resultToSend.action += 'but these words are not in the site'
                    //Debugging Frontend
                    resultToSend.log = JSON.stringify(validation, null, " ");
                    return resultToSend;
                } else if (objToEngine.result == 'dissambiguation') {
                    resultToSend = { action: 'In this site there are many ' + objToEngine.resource + ". Write the same action with one of these words: " };
                    for (let i = 0; i < objToEngine.category.length-1; i++) {
                        resultToSend.action += objToEngine.category[i] + ", ";
                    }
                    resultToSend.action += objToEngine.category[objToEngine.category.length-1];
                    resultToSend.log = JSON.stringify(objToEngine, null, " ");
                    return resultToSend;
                } else {
                    //tutto è andato a buon fine
                    let result = await engine.processIntent(objToEngine);
                    resultToSend = { action: result };
                    //Debugging Frontend
                    resultToSend.log = JSON.stringify(objToEngine, null, " ");
                    //format indica che l'output per Telegram è da formattare
                    if (objToEngine.query.intent == 'list_about')
                        resultToSend.format = "list_about";
                    else if(objToEngine.query.intent != "list_count")
                        resultToSend.format = "true";
                    return resultToSend;
                }
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
    const chatId = req.body.message.chat.id;
    const sentMessage = req.body.message.text;
    //console.log(sentMessage);

    if (sentMessage == '/start') {

        let object = { chat_id: chatId, text: 'Open a site with an URL and then write an action' };
        let responseBot = await MY_FUNCTIONS.post(object, GLOBAL_SETTINGS.TELEGRAM_BOT_URL, 'application/json');
        let responseBotJson = await responseBot.json();
        res.sendStatus(200);

    } else {
        let body = { action: sentMessage };
        let resultToSend = await conversation(body, req, chatId);

        if (resultToSend.error) {
            res.status(resultToSend.error).send(resultToSend.action);
        } else {
            let object = { chat_id: chatId, text: resultToSend.action, parse_mode: "HTML"};
            //console.log(object);
            //Format output for Telegram in case the user do an action. ex: list cat
            if (resultToSend.format == "true") {
                object.text = "";
                for (let i = 0; i < resultToSend.action.length; i++) {
                    if (resultToSend.action[i].title) {
                        object.text += "<b>" + resultToSend.action[i].title + "</b>\n"
                    }
                    for (var key in resultToSend.action[i]) {
                        if (resultToSend.action[i].hasOwnProperty(key) && key!="title") {
                            object.text += key + ": " + resultToSend.action[i][key] + "\n";
                        }
                    }
                    object.text += "\n";
                }
            } else if (resultToSend.format == "list_about") {
                object.text = "";
                for (let i = 0; i < resultToSend.action.length; i++) {
                    object.text += resultToSend.action[i];
                    object.text += "\n";
                }
            }
            //send response
            let responseBot = await MY_FUNCTIONS.post(object, GLOBAL_SETTINGS.TELEGRAM_BOT_URL, 'application/json');
            let responseBotJson = await responseBot.json();
            console.log("response:");
            console.log(responseBotJson);
            res.sendStatus(200);
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
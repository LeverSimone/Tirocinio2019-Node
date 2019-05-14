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

//Array in mempory per mantenere l'associazione tra la chat e il sito di cui si sta parlando
var siteTelegram = [];

app.use('/', express.static('public'));

app.use('/examples/', express.static('examples'));

app.get('/', (req, res) => {
    res.json({ status: 'ok' });
})

function setSession (chatId, valueToSet, req) {
    if(chatId) {
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
            //setSession(chatId, undefined, req);
            
            let configurationURI = await MY_FUNCTIONS.takeConfID(body.action);
            if (configurationURI.error) {
                //res.status(500).send(configurationURI.error);
                return { action: configurationURI.error, error: 500 };
            }
            else if (configurationURI.id) {
                //req.session.configurationURI = configurationURI.id;
                setSession(chatId, configurationURI.id, req);
                //res.json(resultToSend);
                return resultToSend;
            } else {

                //impariamo la struttura del sito da Botify
                let structureBotify = await MY_FUNCTIONS.openSite(body.action);
                if (structureBotify.error) {
                    //res.status(500).send(structureBotify.error);
                    return { action: structureBotify.error, error: 500 };
                } else {
                    //inserisco il link del sito nella struttura imparata
                    structureBotify._id = body.action;

                    //configuriamo Rasa per sapere la struttura del sito in cui ci troviamo
                    configurationURI = await MY_FUNCTIONS.configureValidator(structureBotify);
                    if (configurationURI.error) {
                        //res.status(500).send(configurationURI.error);
                        return { action: configurationURI.error, error: 500 };
                    }
                    else {
                        //salvo in sessione configurationURI
                        //req.session.configurationURI = configurationURI.id;
                        setSession(chatId, configurationURI.id, req);

                        //Debugging Frontend
                        resultToSend.log = JSON.stringify(structureBotify, null, " ");

                        //res.json(resultToSend);
                        return resultToSend;
                    }
                }
            }
        }
        //è un'altro tipo di azione, un comando, ex: "list me proposals", chiamo Rasa per fare la validazione
        else if (req.session.configurationURI || siteTelegram[chatId]) {

            let configurationURI = req.session.configurationURI ? req.session.configurationURI : siteTelegram[chatId] ; 

            //chiamo il server Rasa per fare la validazione dell'input utente
            let validation = await MY_FUNCTIONS.askToValide(body.action, configurationURI);

            if (validation.error) {
                //res.status(500).send(validation.error);
                return { action: validation.error, error: 500 };
            }
            else {
                /*console.log("\n");
                console.log(validation);
                if (validation.matching[0]) {
                    console.log("validation.matching[0].entity");
                    console.log(validation.matching[0].entity);
                    console.log("validation.matching[0].match");
                    console.log(validation.matching[0].match);
                }
                console.log("\n");*/

                let objToEngine = MY_FUNCTIONS.newObjToRun(validation, configurationURI);
                //console.log(objToEngine);

                //inserisci da context, da implementare nella parte di Python
                /*
                //ricordo contesto
                if (!objectValidated.match.resources[0] && !objectValidated.not_matched.resources[0] && req.session.context) {
                    objectValidated.match.resources.push(req.session.context);
                } else {
                    req.session.context = objectValidated.match.resources[0]
                }*/

                //prendi dall'oggetto di ritorno cosa non ha matchato
                if (!objToEngine) {
                    objToEngine = { action: "You insert something that is not in the site" }
                    //Debugging Frontend
                    objToEngine.log = JSON.stringify(validation, null, " ");
                    //res.json(objToEngine)
                    return objToEngine;
                } else {
                    //Debugging Frontend
                    objToEngine.log = JSON.stringify(objToEngine, null, " ");
                    let result = await engine.processIntent(objToEngine);
                    objToEngine.action = JSON.stringify(result, null, " ");
                    //res.json(objToEngine);
                    return objToEngine;
                }
            }
        }
        else {
            //res.json({ action: "You have to open a site before doing an action" });
            return { action: "You have to open a site before doing an action" };
        }
    }
    else {
        //res.status(400).send('Action is empty');
        return { action: "Action is empty'", error: 400 };
    }
}

//Conversation per Telegram
app.post('/', async (req, res) => {
    const chatId = req.body.message.chat.id;
    const sentMessage = req.body.message.text;
    console.log(sentMessage);

    let body = {action: sentMessage};

    let resultToSend = await conversation(body, req, chatId);

    if (resultToSend.error) {
        res.status(resultToSend.error).send(resultToSend.action);
    } else {
        let object = { chat_id: chatId, text: resultToSend.action };
        let responseBot = await MY_FUNCTIONS.post(object, GLOBAL_SETTINGS.TELEGRAM_BOT_URL, 'application/json');
        let responseBotJson = await responseBot.json();

        console.log("response:");
        console.log(responseBotJson);

        res.sendStatus(200);
    }
    /*
    let object = { chat_id: chatId, text: 'hello' };
    let result = await MY_FUNCTIONS.post(object, GLOBAL_SETTINGS.TELEGRAM_BOT_URL, 'application/json');
    let responseBot = await result.json();

    console.log("response:");
    console.log(responseBot);

    res.sendStatus(200);
    */
    //let body = {action: sentMessage};
    //await conversation(body, chatId);
});

app.post('/conversation', async (req, res) => {
    let body = req.body;
    let resultToSend = await conversation(body, req);

    if (resultToSend.error) {
        res.status(resultToSend.error).send(resultToSend.action);
    } else {
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
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

app.use('/', express.static('public'));

app.use('/examples/', express.static('examples'));

app.get('/', (req, res) => {
    res.json({ status: 'ok' });
})

async function conversation (body, idchat, req, res) {
    if (body.action) {
        //L'azione inserita è un sito
        if (body.action.includes('http')) {
            let resultToSend = { action: "Site opened: " + body.action };

            //resetto session context
            req.session.context = undefined;

            let configurationURI = await MY_FUNCTIONS.takeConfID(body.action);
            if (configurationURI.error) {
                res.status(500).send(configurationURI.error);
            }
            else if (configurationURI.id) {
                req.session.configurationURI = configurationURI.id;
                res.json(resultToSend);
            } else {

                //impariamo la struttura del sito da Botify
                let structureBotify = await MY_FUNCTIONS.openSite(body.action);
                if (structureBotify.error) {
                    res.status(500).send(structureBotify.error);
                } else {
                    //inserisco il link del sito nella struttura imparata
                    structureBotify._id = body.action;

                    //configuriamo Rasa per sapere la struttura del sito in cui ci troviamo
                    configurationURI = await MY_FUNCTIONS.configureValidator(structureBotify);
                    if (configurationURI.error) {
                        res.status(500).send(configurationURI.error);
                    }
                    else {
                        //salvo in sessione configurationURI
                        req.session.configurationURI = configurationURI.id;

                        //Debugging Frontend
                        resultToSend.log = JSON.stringify(structureBotify, null, " ");

                        res.json(resultToSend);
                    }
                }
            }
        }
        //è un'altro tipo di azione, un comando, ex: "list me proposals", chiamo Rasa per fare la validazione
        else if (req.session.configurationURI) {

            //chiamo il server Rasa per fare la validazione dell'input utente
            let validation = await MY_FUNCTIONS.askToValide(body.action, req.session.configurationURI);

            if (validation.error) {
                res.status(500).send(validation.error);
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

                let objToEngine = MY_FUNCTIONS.newObjToRun(validation, req.session.configurationURI);
                //console.log(objToEngine);

                //inserisci da context
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
                    res.json(objToEngine)
                } else {
                    //Debugging Frontend
                    objToEngine.log = JSON.stringify(objToEngine, null, " ");
                    let result = await engine.processIntent(objToEngine);
                    objToEngine.action = JSON.stringify(result, null, " ");
                    res.json(objToEngine);
                }
            }
        }
        else {
            res.json({ action: "You have to open a site before doing an action" });
        }
    }
    else {
        res.status(400).send('Action is empty');
    }
}

app.post('/', async (req, res) => {
    const chatId = req.body.message.chat.id;
    const sentMessage = req.body.message.text;
    console.log(sentMessage);

    let object = {chat_id: chatId, text: 'hello'};
    let result = await MY_FUNCTIONS.post(object, GLOBAL_SETTINGS.TELEGRAM_BOT_URL, 'application/json');
    let responseBot = await result.json();

    console.log("response:");
    console.log(responseBot);

    res.sendStatus(200);
    //let body = {action: sentMessage};
    //await conversation(body, chatId);
});

app.post('/conversation', async (req, res) => {
    let body = req.body;
    await conversation(body, null, req, res);
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
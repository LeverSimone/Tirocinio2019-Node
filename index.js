const express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');

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

app.get('/', (req, res) => {
    res.json({ status: 'ok' });
})

app.post('/conversation', async (req, res) => {
    let body = req.body;
    if (body.action) {
        //L'azione inserita è un sito
        if (body.action.includes('http')) {
            let resultToSend = { action: "Site opened: " + body.action };

            //resetto session context
            req.session.context = undefined;

            let configurationURI = await MY_FUNCTIONS.takeConfID(body.action);

            if (configurationURI.id) {
                req.session.configurationURI = configurationURI.id;
                res.json(resultToSend);
            } else {

                //impariamo la struttura del sito da Botify
                let structureBotify = await MY_FUNCTIONS.openSite(body.action);
                if (structureBotify.error) {
                    res.status(500).send(structureBotify);
                } else {
                    //inserisco il link del sito nella struttura imparata
                    structureBotify._id = body.action;

                    //configuriamo Rasa per sapere la struttura del sito in cui ci troviamo
                    configurationURI = await MY_FUNCTIONS.configureValidator(structureBotify);
                    if (configurationURI.error) {
                        res.status(500).send(configurationURI);
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
                res.status(500).send(validation);
            }
            else {
                //prendo solo gli elementi interessanti dalla risposta validata
                let objectValidated = MY_FUNCTIONS.validator(validation, req);

                //ricordo contesto
                if (!objectValidated.match.resources[0] && !objectValidated.not_matched.resources[0] && req.session.context) {
                    objectValidated.match.resources.push(req.session.context);
                } else {
                    req.session.context = objectValidated.match.resources[0]
                }

                //compongo la stringa di output
                let resultToSend = { action: MY_FUNCTIONS.composeResult(objectValidated) };

                //Debugging Frontend
                resultToSend.log = JSON.stringify(validation, null, " ");
                res.json(resultToSend);
            }
        }
        else {
            res.json({ action: "You have to open a site before doing an action" });
        }
    }
    else {
        res.status(400).send('Action is empty');
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
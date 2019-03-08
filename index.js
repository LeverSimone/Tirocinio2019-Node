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
            
            //resetto session context
            req.session.context = undefined;

            //impariamo la struttura del sito da Botify
            let structureBotify = await MY_FUNCTIONS.openSite(req, body.action);
            if (structureBotify.error) {
                res.status(500).send(structureBotify);
            } else {

                console.log(structureBotify);
                //configuriamo Rasa per sapere la struttura del sito in cui ci troviamo
                let configurationURI = await MY_FUNCTIONS.configureValidator(structureBotify);
                if (configurationURI.error) {
                    res.status(500).send(configurationURI);
                }
                else {
                    //salvo in sessione configurationURI
                    req.session.configurationURI = configurationURI;

                    let resultToSend = { action: "Site opened: " + body.action + "ID:" + configurationURI.id };
                    //Debugging Frontend
                    resultToSend.log = JSON.stringify(structureBotify, null, " ");

                    res.json(resultToSend);
                }
            }
        }
        //è un'altro tipo di azione, un comando, ex: "list me proposals", chiamo Rasa per fare la validazione
        else if (req.session.configurationURI) {
            let responseToSend = {};
            //console.log(body.action);
            //console.log(req.session.configurationURI);

            let validation = await MY_FUNCTIONS.askValidator(body.action, req.session.configurationURI);
            console.log(validation);

            if (validation.error) {
                res.status(500).send(validation);
            }
            else {
                //let objectValidated = MY_FUNCTIONS.newValidator(validation, req);

                //let resultToSend = MY_FUNCTIONS.composeResult(objectValidated);
                let resultToSend = {};

                responseToSend.action = "it works"
                responseToSend.log = JSON.stringify(validation, null, " ");
                res.json(responseToSend);
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
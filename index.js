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
            let resultToSend = await MY_FUNCTIONS.openSite(req, body.action);
            if(resultToSend.error)
            {
                res.status(500).send(resultToSend.error);
            } else {
                res.json(resultToSend);
            }
        }
        //è un'altro tipo di azione, chiedo a Rasa
        else if (req.session.site) {
            let intentRasa = await MY_FUNCTIONS.askRasa(body.action);
            if (intentRasa.error) {
                res.status(500).send(intentRasa.error);
            }
            else {
                //console.log("intentRasa:")
                //console.log(intentRasa);

                //prendo/setto resource in sessione
                if (!intentRasa.resource) { 
                    intentRasa.resource = req.session.context;
                } else {
                    req.session.context = intentRasa.resource;
                }

                responseToSend = MY_FUNCTIONS.validator(req.session.site.structure, intentRasa, req);
                //console.log(responseToSend);
                res.json({ action: responseToSend });
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
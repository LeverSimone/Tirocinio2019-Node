const express = require('express');
var bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const GLOBAL_SETTINGS = require("./global_settings.js");
const MY_FUNCTIONS = require("./function.js");

var structureBotify = null;

app.use('/', express.static('public'));

app.get('/', (req, res) => {
    res.json({ status: 'ok' });
})

app.post('/conversation', async (req, res) => {
    let body = req.body;
    if (body.action) {
        //L'azione inserita è un sito
        if (body.action.includes('http')) {
            let objToPuppetteer = { site: body.action };
            let resultToSend = { action: "Site opened: " + body.action };
            try {
                let result = await MY_FUNCTIONS.post(objToPuppetteer, GLOBAL_SETTINGS.DESTINATION_URL_PUPPETEER + "/opensite", 'application/json');
                structureBotify = await result.json();

                console.log(structureBotify);

                res.json(resultToSend);
            } catch (error) {
                console.log(error)
                res.status(500).send(error);
            }
        }
        //è un'altro tipo di azione, chiedo a Rasa
        else {

            let object = { q: body.action, project: "conversation" };
            try {
                let reqRasa = await MY_FUNCTIONS.post(object, GLOBAL_SETTINGS.DESTINATION_URL_RASA + "/parse", 'application/x-yml');
                let resRasa = await reqRasa.json();
                let intentRasa = { intent: resRasa.intent.name }
                if (resRasa.entities[0])
                    intentRasa.entity = resRasa.entities[0].value;

                //console.log(structureBotify);
                //console.log(intentRasa);

                //confronto intent e attribute di Rasa con quelli imparati da Node
                if (structureBotify) {
                    if (structureBotify.intent == intentRasa.intent) {
                        if (structureBotify.resource == intentRasa.entity) {
                            res.json({ action: "Intent recognised: " + structureBotify.intent + ", resource: " + structureBotify.resource + ", attribute: none" });
                        }
                        else {
                            res.json({ action: "Sorry, there are no " + intentRasa.entity + " in this site. Did you mean " + structureBotify.resource + "?" });
                        }
                    }
                    else {
                        res.json({ action: "Intent not recognised, in this site you can: " + structureBotify.intent });
                    }
                }
                else {
                    res.json({ action: "You have to open a site before doing an action" });
                }
            } catch (error) {
                res.status(500).send(error);
            }
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
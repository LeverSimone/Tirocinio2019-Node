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
    if(body.action) {
        let objToPuppetteer = {site: body.action};
        let resultToSend = {action: "Sito aperto: " + body.action};
        try {
            let result = await MY_FUNCTIONS.post(objToPuppetteer, GLOBAL_SETTINGS.DESTINATION_URL_PUPPETEER + "/opensite", 'application/json');
            structureBotify = await result.json();
            
            console.log(structureBotify);

            res.json(resultToSend);
        } catch (error) {
            res.status(500).send(error);
        }
    }
    else{
        res.sendStatus(400);
    }
})

app.post('/helloname', async (req, res) => {
    let input = req.body;
    if(input.phrase) {
        let object = {q: input.phrase, project: "helloname"};
        try {
            let result = await MY_FUNCTIONS.post(object, GLOBAL_SETTINGS.DESTINATION_URL_RASA + "/parse", 'application/x-yml');
            let resultjson = await result.json();
            //console.log(resultjson);
            let resToSend = {intent: resultjson.intent.name}
            if(resultjson.entities[0])
                resToSend.entity = resultjson.entities[0].value;
            res.json(resToSend);
        } catch (error) {
            res.status(500).send(error);
        }
    }
    else{
        res.sendStatus(400);
    }
})

app.listen(GLOBAL_SETTINGS.PORT, () => console.log('Example app listening on port ' + GLOBAL_SETTINGS.PORT))
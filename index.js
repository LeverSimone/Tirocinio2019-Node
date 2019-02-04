const express = require('express');
var bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const GLOBAL_SETTINGS = require("./global_settings.js");
const MY_FUNCTIONS = require("./function.js");

app.use('/', express.static('public'));

app.get('/', (req, res) => {
    res.json({ status: 'ok' });
})

app.post('/helloname', async (req, res) => {
    let input = req.body;
    if(input.phrase) {
        let object = {q: input.phrase, project: "helloname"};
        try {
            let result = await MY_FUNCTIONS.post(object, "/parse");
            resultjson = await result.json();
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
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
const DATA = require("./data.js");
const MAIN_FUNCTION = require("./main_function.js");

app.use('/', express.static('public'));

app.use('/examples/', express.static('examples'));

app.get('/', (req, res) => {
    res.json({ status: 'ok' });
})

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
        let resultToSend = await MAIN_FUNCTION.conversation(body, req, chatId);

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

                if (DATA.getLenghtResultTelegram(chatId) != 0)
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
    let resultToSend = await MAIN_FUNCTION.conversation(body, req);

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
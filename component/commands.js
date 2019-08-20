const DATA = require("../data.js");
const OPENSITE = require("../opensite.js");
const MY_FUNCTIONS = require("../function.js");
const GLOBAL_SETTINGS = require("../global_settings.js");

async function go_back(chatId, req) {
    let resultToSend;
    if (DATA.getLastURI(chatId, req)) {
        let lastURI = DATA.getLastURI(chatId, req)
        console.log("lastURI");
        console.log(lastURI);
        resultToSend = await OPENSITE.openSite(lastURI, req, chatId);
    } else {
        resultToSend = { action: "You can't go back in this moment" };
    }
    resultToSend.format = "false";
    return resultToSend;
}

async function go_site(chatId, req, validation) {
    let resultToSend;
    if (validation.entities[0]) {
        let wordToSite = validation.entities[0].value;
        let result = await MY_FUNCTIONS.get(GLOBAL_SETTINGS.DESTINATION_URL_RASA + '/wordtosite?site=' + wordToSite);
        let linkObject = await result.json();
        if (linkObject.link) {
            resultToSend = await OPENSITE.openSite(linkObject.link, req, chatId);
        } else {
            resultToSend = { action: "I don't know the site that you want to open" };
        }
    } else {
        resultToSend = { action: "I don't understand what site you want to open" };
    }
    resultToSend.format = "false";
    return resultToSend;
}

module.exports = { go_back, go_site };
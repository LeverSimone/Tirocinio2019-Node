const DATA = require("../data.js");
const OPENSITE = require("../opensite.js");

function show_more (chatId, req, nResult) {
    let resultToSend;
    if (DATA.getExistResult(chatId, req)) {
        resultToSend = { action: null };
        resultToSend.action = DATA.getResult(chatId, req, nResult);
        resultToSend.format = "true";
    } else {
        resultToSend = { action: "You can't \"show more\" in this moment" };
        resultToSend.format = "false";
    }
    return resultToSend;
}

async function open_element (chatId, req, validation) {
    let resultToSend;
    if (validation.position) {
        let position = validation.position - 1;
        //salva la lista di news trovate e guarda se nella posizione esiste bot-attribute:link
        let lastList = DATA.getLastResult(chatId, req);
        console.log("position >= 0 && position < lastList.length")
        console.log(position >= 0 && position < lastList.length)
        console.log("lastList[position].link")
        console.log(lastList[position].link)
        if (position >= 0 && position < lastList.length && lastList[position].link) {
            //link founded, go to open it
            resultToSend = await OPENSITE.openSite(lastList[position].link, req, chatId);
            resultToSend.format = "false";
        } else {
            resultToSend = { action: "You can't open this element" };
            resultToSend.format = "false";
        }
    } else {
        resultToSend = { action: "I don't understand what element you want to open" };
        resultToSend.format = "false";
    }
    return resultToSend;
}

module.exports = { show_more, open_element };
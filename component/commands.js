const DATA = require("../data.js");
const OPENSITE = require("../opensite.js");

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

module.exports = { go_back };
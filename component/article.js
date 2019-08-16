const DATA = require("../data.js");

function article_read() {
    let resultToSend;
    //creare oggetto da mandare a conweb_engine per eseguire lettura
    resultToSend = { action: "You can't \"read\" in this moment. This functionality is not complete" };
    resultToSend.format = "false";
    return resultToSend;
}

module.exports = { article_read };
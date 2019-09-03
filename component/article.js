function article_read(chatId, req, validation, configurationURI) {
    let resultToSend;
    //creare oggetto da mandare a conweb_engine per eseguire lettura
    let objToEngine = objArticleReadToRun(validation, configurationURI);
    resultToSend = { action: "You can't \"read\" in this moment. This functionality is not complete" };
    resultToSend.log = JSON.stringify(objToEngine, null, " ");;
    resultToSend.format = "false";
    return resultToSend;
}

function objArticleReadToRun(validation, link) {
    let object;

    object = {
        url: link,
        component: "article",
        query: {
            intent: "article_read",
            resource: {
                selector: validation.title,
                attributes: validation.text
            }
        }
    };
    //setto che tutto è andato a buon fine
    console.log(object)
    console.log(object.query.resource.attributes)
    return object;
}

module.exports = { article_read };
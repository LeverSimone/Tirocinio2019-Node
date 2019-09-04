const engine = require('conweb-engine/components/engine');

async function article_read(chatId, req, validation, configurationURI) {
    let resultToSend;
    //crea oggetto da mandare a conweb_engine per eseguire lettura
    let objToEngine = objArticleReadToRun(validation, configurationURI);
    //resultToSend = { action: "You can't \"read\" in this moment. This functionality is not complete" };
    let resultComplete = await engine.processIntent(objToEngine);
    resultToSend = { action: resultComplete };
    resultToSend.log = JSON.stringify(objToEngine, null, " ");;
    resultToSend.format = "article";
    return resultToSend;
}

function objArticleReadToRun(validation, link) {
    let object;

    object = {
        url: link,
        component: "article",
        query: {
            intent: "article_sum",
            resource: {
                selector: validation.title,
                attributes: validation.text
            }
        }
    };
    console.log(object)
    console.log(object.query.resource.attributes)
    return object;
}

module.exports = { article_read };
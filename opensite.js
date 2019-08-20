const DATA = require("./data.js");
const MY_FUNCTIONS = require("./function.js");

async function openSite(link, req, chatId) {
    let resultToSend = { action: "Site opened: " + link + " \n" };

    console.log("req.session");
    console.log(req.session);

    //controllo se conosco già il sito
    let config = await MY_FUNCTIONS.takeConf(link);
    if (config.error) {
        return { action: config.error, error: 500 };
    }
    else if (config.site) {
        //sito gia' presente in mongoDB, salvo in sessione e viene modificato resultToSend per scrivere all'utente
        DATA.openSiteData(chatId, req, config);
        resultToSend = MY_FUNCTIONS.createOutputSiteContent(config, resultToSend);
        return resultToSend;
    } else {
        //impariamo la struttura del sito da Botify
        let structureBotify = await MY_FUNCTIONS.openSitePuppeteer(link);
        if (structureBotify.error) {
            return { action: structureBotify.error, error: 500 };
        } else {
            //inserisco il link del sito nella struttura imparata per inviarla a Rasa
            structureBotify._id = link;

            //configuriamo Rasa per sapere la struttura del sito in cui ci troviamo
            let config = await MY_FUNCTIONS.configureValidator(structureBotify);
            if (config.error) {
                return { action: config.error, error: 500 };
            }
            else {
                //salvo in sessione l'URI del sito e modifico resultToSend
                config.site.siteObject = config.site.id;
                DATA.openSiteData(chatId, req, config);
                resultToSend = MY_FUNCTIONS.createOutputSiteContent(config, resultToSend);
                //Debugging Frontend
                resultToSend.log = JSON.stringify(structureBotify, null, " ");

                return resultToSend;
            }
        }
    }
}

module.exports = { openSite };
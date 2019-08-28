//Array in memory per mantenere l'associazione tra la chat e il sito di cui si sta parlando
var siteTelegram = [];
//Array in memory per mantenere l'associazione tra la chat e il sito di cui si sta parlando
var lastURITelegram = [];
//Array in memory per mantenere l'associazione tra la chat e il sito di cui si sta parlando
var objectRasaURITelegram = [];
//Array in memory per mantenere l'associazione tra la chat e l'oggetto di risposta di cui si sta parlando
var resultTelegram = [];
//Array in memory per mantenere l'associazione tra la chat e l'ultima lista di risposta
var lastResultTelegram = []
//Array in memory per mantenere l'associazione tra la chat e la resource di cui si sta parlando
var resourceTelegram = [];
//Array in memory per mantenere l'associazione tra la chat e il componente di cui si sta parlando
var componentTelegram = [];
//Array in memory per mantenere l'associazione tra la chat e l'indice degll'attributo del form
var indexFormTelegram = [];

function clearSession(chatId, req) {
    if (chatId) {
        resultTelegram[chatId] = [];
        lastResultTelegram[chatId] = [];
        resourceTelegram[chatId] = null;
        componentTelegram[chatId] = null;
        indexFormTelegram[chatId] = null;
    } else {
        req.session.result = [];
        req.session.lastResult = [];
        req.session.resource = null;
        req.session.component = null;
        req.session.indexForm = null;
    }
}

//Settare contenuto per la sessione per l'end point web e per l'array in memory per Telegram
function setSession(chatId, valueToSet, req, type) {
    if (chatId) {
        if (type == "site")
            siteTelegram[chatId] = valueToSet;
        else if (type == "lastURI")
            lastURITelegram[chatId] = valueToSet;
        else if (type == "objectLink")
            objectRasaURITelegram[chatId] = valueToSet;
        else if (type == "result")
            resultTelegram[chatId] = valueToSet;
        else if (type == "lastResult")
            lastResultTelegram[chatId] = valueToSet;
        else if (type == "component")
            componentTelegram[chatId] = valueToSet;
        else if (type == "indexForm")
            indexFormTelegram[chatId] = valueToSet;
        else
            resourceTelegram[chatId] = valueToSet;
    } else {
        if (type == "site")
            req.session.configurationURI = valueToSet;
        else if (type == "lastURI")
            req.session.lastURI = valueToSet;
        else if (type == "objectLink")
            req.session.objectRasaURI = valueToSet;
        else if (type == "result")
            req.session.result = valueToSet;
        else if (type == "lastResult")
            req.session.lastResult = valueToSet;
        else if (type == "component")
            req.session.component = valueToSet;
        else if (type == "indexForm")
            req.session.indexForm = valueToSet;
        else
            req.session.resource = valueToSet;
    }
}

function openSiteData(chatId, req, config) {
    setSession(chatId, config.site.id, req, "site");
    setSession(chatId, config.site.siteObject, req, "objectLink");
    clearSession(chatId, req);
}

function getURI(chatId, req) {
    if (req.session.configurationURI || siteTelegram[chatId]) {
        let configurationURI = req.session.configurationURI ? req.session.configurationURI : siteTelegram[chatId];
        return configurationURI;
    } else {
        return false;
    }
}

function getLastURI(chatId, req) {
    if (req.session.lastURI || lastURITelegram[chatId]) {
        let lastURI = req.session.lastURI ? req.session.lastURI : lastURITelegram[chatId];
        return lastURI;
    } else {
        return false;
    }
}

function getRasaURI(chatId, req) {
    if (req.session.objectRasaURI || objectRasaURITelegram[chatId]) {
        let objectRasaURI = req.session.objectRasaURI ? req.session.objectRasaURI : objectRasaURITelegram[chatId];
        return objectRasaURI;
    } else {
        return false;
    }
}

function getLastResult(chatId, req) {
    let lastList = req.session.lastResult ? req.session.lastResult : lastResultTelegram[chatId];
    return lastList;
}

function getExistResult(chatId, req) {
    return (req.session.result && req.session.result.length > 0) || (resultTelegram[chatId] && resultTelegram[chatId].length > 0)
}

function getResult(chatId, req, nResult) {
    let result = req.session.result ? req.session.result.splice(0, nResult) : resultTelegram[chatId].splice(0, nResult);
    setSession(chatId, result, req, "lastResult");
    return result;
}

function getLengthResult(chatId, req) {
    let result = req.session.result ? req.session.result : resultTelegram[chatId];
    return result.length;
}


function getResource(chatId, req) {
    return req.session.resource ? req.session.resource : resourceTelegram[chatId];
}

function getComponent(chatId, req) {
    if (req.session.component || componentTelegram[chatId]) {
        let component = req.session.component ? req.session.component : componentTelegram[chatId];
        return component
    } else {
        return false;
    }
}

function getIndexForm(chatId, req) {
    let indexForm = req.session.indexForm ? req.session.indexForm : indexFormTelegram[chatId];
    return indexForm;
}

module.exports = { clearSession, setSession, getURI, getLastURI, getRasaURI, getLastResult, getExistResult, getResult, getLengthResult, getResource, openSiteData, getComponent, getIndexForm };
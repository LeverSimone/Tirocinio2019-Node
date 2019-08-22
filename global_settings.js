const PORT = process.env.PORT || 3000;
const DESTINATION_PORT_RASA = 8080;
const DESTINATION_PORT_PUPPETEER = 4000;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:' + PORT;
const DESTINATION_URL_RASA = process.env.HEROKU ? "https://tirocinio2019-rasanlu.herokuapp.com" : 'http://localhost:' + DESTINATION_PORT_RASA;
const DESTINATION_URL_PUPPETEER = process.env.HEROKU ? "https://tirocinio2019-puppeteer.herokuapp.com" : "http://localhost:" + DESTINATION_PORT_PUPPETEER;
const TELEGRAM_BOT_URL = process.env.BOT_TOKEN ? "https://api.telegram.org/bot"+process.env.BOT_TOKEN+'/sendMessage' : "https://api.telegram.org/bot816662742:AAG4U6wvv8DSYAMg_x_SPfheHWyPRtu8Sis/sendMessage";
const TELEGRAM_MAX_MESSAGE = 4096;

//numero di risultati da ritornare
const NRESULT = 5;

module.exports = {PORT, SERVER_URL, DESTINATION_URL_RASA, DESTINATION_URL_PUPPETEER, TELEGRAM_BOT_URL, TELEGRAM_MAX_MESSAGE, NRESULT};
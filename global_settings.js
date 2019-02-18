const PORT = process.env.PORT || 3000;
const DESTINATION_PORT_RASA = 5000;
const DESTINATION_PORT_PUPPETEER = 4000;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:' + PORT;
const DESTINATION_URL_RASA = process.env.HEROKU ? "https://tirocinio2019-rasanlu.herokuapp.com" : 'http://localhost:' + DESTINATION_PORT_RASA;
const DESTINATION_URL_PUPPETEER = process.env.HEROKU ? "https://tirocinio2019-puppeteer.herokuapp.com" : "http://localhost:" + DESTINATION_PORT_PUPPETEER;

module.exports = {PORT, DESTINATION_PORT_RASA, DESTINATION_PORT_PUPPETEER, SERVER_URL, DESTINATION_URL_RASA, DESTINATION_URL_PUPPETEER};
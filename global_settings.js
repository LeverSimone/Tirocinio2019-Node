const PORT = process.env.PORT || 3000;
const DESTINATION_PORT_RASA = 5000;
const DESTINATION_PORT_PUPPETEER = 4000;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:' + PORT;
const DESTINATION_URL_RASA = 'http://localhost:' + DESTINATION_PORT_RASA;
//const DESTINATION_URL_RASA = "https://tirocinio2019-rasanlu.herokuapp.com";
//const DESTINATION_URL_PUPPETEER = "https://tirocinio2019-rasanlu.herokuapp.com";
const DESTINATION_URL_PUPPETEER = "http://localhost:" + DESTINATION_PORT_PUPPETEER;

module.exports = {PORT, DESTINATION_PORT_RASA, DESTINATION_PORT_PUPPETEER, SERVER_URL, DESTINATION_URL_RASA, DESTINATION_URL_PUPPETEER};
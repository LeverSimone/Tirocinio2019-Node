const PORT = process.env.PORT || 3000;
const DESTINATION_PORT = 5000;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:' + PORT;
//const DESTINATION_URL = 'http://localhost:' + DESTINATION_PORT;
const DESTINATION_URL = "https://tirocinio2019-rasanlu.herokuapp.com";

module.exports = {PORT, DESTINATION_PORT, SERVER_URL, DESTINATION_URL};
const GLOBAL_SETTINGS = require("./global_settings.js");
const fetch = require("node-fetch");

function post (object, url) {
    return fetch (GLOBAL_SETTINGS.DESTINATION_URL + url, {
        method: 'post',
        headers: {
            'Content-Type': 'application/x-yml',
            'Accept' : 'application/json',
        },
        body: JSON.stringify(object)
    })
}

module.exports = {post};
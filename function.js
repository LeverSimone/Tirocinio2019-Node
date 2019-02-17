const GLOBAL_SETTINGS = require("./global_settings.js");
const fetch = require("node-fetch");

function post (object, url, type) {
    return fetch (url, {
        method: 'post',
        headers: {
            'Content-Type': type,
            'Accept' : 'application/json',
        },
        body: JSON.stringify(object)
    })
}

module.exports = {post};
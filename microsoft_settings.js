// ---------------------------------------------------
// Get our subscription key from a file outside of our repo
const microsoftSubscriptionKey = require('./credentials.js').microsoftSubscriptionKey;

// ---------------------------------------------------
const uriBase = 'https://westcentralus.api.cognitive.microsoft.com/vision/v2.0/analyze';
module.exports.uriBase = uriBase;

// ---------------------------------------------------
    // 'visualFeatures': 'Objects,Tags',
const params = {
    'visualFeatures': 'Tags,Color',
    'details': '',
    'language': 'en'
};
module.exports.params = params;

// ---------------------------------------------------
const options = {
    uri: uriBase,
    qs: params,
    body: '{"url": ""}',
    headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key' : microsoftSubscriptionKey
    }
};
module.exports.options = options;



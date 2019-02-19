// ---------------------------------------------------
const subscriptionKey = '';
module.exports.subscriptionKey = subscriptionKey;

// ---------------------------------------------------
const uriBase = 'https://westcentralus.api.cognitive.microsoft.com/vision/v2.0/analyze';
module.exports.uriBase = uriBase;

// ---------------------------------------------------
const imageUrl = 'https://instagram.fams1-1.fna.fbcdn.net/vp/26b9bbdfcc938fe1f2caeb4862a67ecb/5D26859B/t51.2885-15/e35/51654253_323669641588442_7204574490380692033_n.jpg?_nc_ht=instagram.fams1-1.fna.fbcdn.net';
module.exports.imageUrl = imageUrl;

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
    body: '{"url": ' + '"' + imageUrl + '"}',
    headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key' : subscriptionKey
    }
};
module.exports.options = options;



module.exports.DEBUG = process.env.DEBUG === 'true';

module.exports.SCOPE = process.env.FOOSBOARD_SCOPE;
module.exports.TOKEN = process.env.FOOSBOARD_TOKEN;
module.exports.CLIENT_ID = process.env.FOOSBOARD_CLIENT_ID;
module.exports.CLIENT_SECRET = process.env.FOOSBOARD_CLIENT_SECRET;

module.exports.FIREBASE_INFO = require('./database.config');
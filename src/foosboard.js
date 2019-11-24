const env = require('./environment');

var express = require('express');
var router = express.Router();

var database = require('./database');

router.use((req, res, next) =>
{
    if (env.DEBUG)
    {
        console.log('-'.repeat(20));
        console.log(req.method + ' ' + req.originalUrl);
        console.log('body:');
        console.info(req.body);
        console.log('-'.repeat(20));
    }

    next();
});

router.get('/teamname', (req, res) =>
{
    res.sendStatus(200);
});

router.get('/game', (req, res) =>
{
    // TODO: don't hardcode data
    var winners = [{id: 'U0000', name: 'walker'}, {id: 'U0001', name: 'abel'}];
    var losers = [{id: 'U0002', name: 'rohan'}, {id: 'U0003', name: 'david'}];

    var is1v1 = winners.length == 1 && losers.length == 1;
    var is2v2 = winners.length == 2 && losers.length == 2;

    if (!is1v1 && !is2v2)
    {
        // Must be either a 2v2 game or 1v1 game
        res.sendStatus(400);
        return;
    }

    var userIDs = new Set();
    winners.forEach(user => userIDs.add(user.id));
    losers.forEach(user => userIDs.add(user.id));

    if (userIDs.size != winners.length + losers.length)
    {
        // Player appears multiple times in the game
        res.sendStatus(400);
        return;
    }

    database.AddGame(winners, losers);

    res.sendStatus(200);
});

module.exports = router;
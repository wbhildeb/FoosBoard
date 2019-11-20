const env = require('./environment');

var express = require('express');
var router = express.Router();

var app = express();

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
    res.sendStatus(200);
});
const { DEBUG, SCOPE, TOKEN, CLIENT_ID, CLIENT_SECRET } = require('./environment');

var bodyParser = require('body-parser');
var express = require('express');
// var slack = require('./slack');
var router = express.Router();

var database = require('./database');
var slack = require('express-slack');

const respondWrongFormat = function(res)
{
  res.status(200).send({
    response_type: 'ephemeral',
    text: 'Oopsie Woopsie! Someone was a tilly lil\' Korman and used the wrong format!'
  });
}

const calculateScore = function(wins, losses)
{
  if (wins === 0) return -losses;

  var z, phat, n;

  z = 1.96;
  n = wins + losses
  phat = 1 * wins / n;

  return (phat + z*z/(2*n) - z * Math.sqrt((phat*(1-phat)+z*z/(4*n))/n))/(1+z*z/n);
}

const getWinVerb = function()
{
  const verbs = ['beat', 'bested', 'demolished', 'destroyed', 'overtook', 'obliterated'];
  return verbs[Math.floor(Math.random()*verbs.length)];
}


router.use('*', slack({
    scope: SCOPE,
    token: TOKEN,
    store: '../data.json',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  }))
  .use('*', (req, res, next) =>
  {
    console.log(`${req.method} ${req.url}`);
    console.log(`   session: ${req.sessionID}`);
    console.log('   query:', req.query);
    console.log('   body:', req.body);
    console.log('-----------------------------------------------');
    next();
  });

slack.on('/team', (payload, bot) =>
{
  bot.reply('works!');
  console.log(payload);
});

// router.post('/team', (req, res) =>
// {
//   const input = req.slack.input;
//   if (!req.slack.input.match(/(user)+text/))
//   {
//     slack.SendResponseMessage(
//       res,
//       'Incorrect format for the command'
//     );
//     return;
//   }

//   const users = input
//     .filter(elem => elem.type == 'user')
//     .map(elem => ({ id: elem.id, name: elem.username }));
//   const userIDs = users.map(elem => elem.id);
//   const userIDsAreUnique = userIDs.length === new Set(userIDs).size;

//   if (!userIDsAreUnique)
//   {
//     slack.SendResponseMessage(
//       res,
//       'Cannot have a duplicate user on a team'
//     );
//     return;
//   }

//   const teamName = input[input.length-1].text;

//   slack.SendResponseMessage(
//     res,
//     `Creating team '${teamName}'...`
//   );

//   database
//     .AddTeam(users, teamName)
//     .then(() =>
//     {
//       slack.SendResponseMessage(
//         req.slack.responseURL,
//         `Created team: '${teamName}'!`,
//         { in_channel: true }
//       );
//     })
//     .catch(error =>
//     {
//       slack.SendResponseMessage(
//         req.slack.responseURL,
//         'Something went wrong on our end, we weren\'t able to make your team :('
//       );
//     });
// });

// router.post('/game', (req, res) =>
// {
//   const input = req.slack.input;
//   if (!input.match(/(userusertextuseruser|usertextuser)/))
//   {
//     slack.SendResponseMessage(
//       res,
//       'Incorrect format for the command'
//     );
//     return;
//   }

//   const is1v1 = !!input.match(/usertextuser/);
//   const whoWonText = is1v1 ? input[1].text : input[2].text;
//   if (whoWonText != 'beat')
//   {
//     slack.SendResponseMessage(
//       res,
//       'You gotta use \'beat\'. I removed the fancy words for now, sorry...'
//     );
//     return;
//   }

//   const users = input
//     .filter(elem => elem.type == 'user')
//     .map(elem => ({ id: elem.id, name: elem.username }));
//   const userIDs = users.map(elem => elem.id);
//   const userIDsAreUnique = userIDs.length === new Set(userIDs).size;

//   if (!userIDsAreUnique)
//   {
//     slack.SendResponseMessage(
//       res,
//       'Cannot have a duplicate player in a game'
//     );
//     return;
//   }

//   slack.SendResponseMessage(
//     res,
//     'Recording the game now...',
//   );

//   const winner = is1v1 ?
//     { id: input[0].id, name: input[0].username } :
//     [{ id: input[0].id, name: input[0].username }, { id: input[1].id, name: input[1].username }];

//   const loser = is1v1 ?
//     { id: input[2].id, name: input[2].username } :
//     [{ id: input[3].id, name: input[3].username }, { id: input[4].id, name: input[4].username }];

//   const getWinnerName = is1v1 ?
//     Promise.resolve(winner.name) : database.GetTeamName(winner);

//   const getLoserName = is1v1 ?
//     Promise.resolve(loser.name) : database.GetTeamName(loser);

//   Promise
//     .all([getWinnerName, getLoserName, recordGame])
//     .then((winnerName, loserName) =>
//     {
//       slack.SendResponseMessage(
//         req.slack.responseURL,
//         `New Game Recorded: ${winnerName} ${getWinVerb()} ${loserName}! GG`,
//         { in_channel: true }
//       );
//     })
//     .catch(error =>
//     {
//       slack.SendResponseMessage(
//         req.slack.responseURL,
//         `Unable to record the game! Sorry :(`
//       );
//     });
// });

// router.post('/score', (req, res) =>
// {
//   const input = req.slack.input;
//   if (!input.match(/(text)?/))
//   {
//     slack.SendResponseMessage(
//       res,
//       'Incorrect format for the command'
//     );
//     return;
//   }

//   var scoreType = req.body.text || 'combo';

//   const getScores =
//     scoreType === 'solo' ? database.GetSoloScores() :
//     scoreType === 'team' ? database.GetTeamScores() :
//     scoreType === 'combo' ? database.GetCombinedScores() :
//     null;

//   if (!getScores)
//   {
//     slack.SendResponseMessage(
//       res,
//       `Sorry, I don't recognize '${scoreType}' -- try 'solo', 'team' or 'combo'`
//     );
//     return;
//   }

//   getScores.then(scores =>
//   {
//     var nameColumnLen = scores.reduce((len, curVal) => Math.max(len, curVal.name.length), -1);
//     nameColumnLen = Math.max(nameColumnLen, 15) + 5;

//     const scoreColumnLen = 6

//     var text =
//       '```' +
//       'Player' + ' '.repeat(nameColumnLen-6) +
//       'Wins' + ' '.repeat(scoreColumnLen-4) +
//       'Losses' + ' '.repeat(scoreColumnLen-6) +
//       ' '.repeat(4) + '\n';

//     scores.forEach(player => {
//       player.score = calculateScore(player.wins, player.losses);
//     });

//     scores.sort((a, b) => a.score > b.score ? -1 : 1);

//     scores.forEach(({name, wins, losses}) =>
//     {
//       wins = String(wins);
//       losses = String(losses);
//       text +=
//         name + '.'.repeat(nameColumnLen-name.length) +
//         wins + '.'.repeat(scoreColumnLen-wins.length) +
//         losses + '.'.repeat(scoreColumnLen-losses.length + 4) +
//         '\n';
//     })

//     text += '```';

//     res.status(200).send({
//       response_type: 'in_channel',
//       mrkdwn: true,
//       text
//     });
//   });
// });

module.exports = router;
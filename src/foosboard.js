const env = require('./environment');

var bodyParser = require('body-parser');
var express = require('express');
var router = express.Router();

var database = require('./database');

const parse = function(text)
{
  var phrases = [];
  text
    .split(' ')
    .filter(x => !!x)
    .forEach(word =>
    {
      var type = 'text';

      // 0 : full match
      // 1 : '@' (for user) or '#' for channel
      // 2 : id
      // 3 : name
      var matches = word.match(/<(.)(.+)\|(.+)>/);
      if (matches)
      {
        if (matches[1] === '@') type = 'user';
        else if (matches[1] === '#') type = 'channel';
        else throw new Error('Invalid format');

        phrases.push({
          type,
          id: matches[2],
          name: matches[3]
        });
      }
      else if (phrases.length && phrases[phrases.length - 1].type === 'text')
      {
        phrases[phrases.length - 1].value += ' ' + word;
      }
      else
      {
        phrases.push({ type, value: word });
      }
    });

  return phrases;
}

const respondWrongFormat = function(res)
{
  res.status(200).send({
    response_type: 'ephemeral',
    text: 'Oopsie Woopsie! Someone was a tilly lil\' Korman and used the wrong format!'
  });
}

router.use(bodyParser.urlencoded({ extended: true }));

router.post('/team', (req, res) =>
{
  var phrases = [];

  try
  {
    phrases = parse(req.body.text);
  }
  catch
  {
    console.log('Parse failed');
    respondWrongFormat(res);
    return;
  }

  if (!phrases.length)
  {
    console.log('Parsed no phrases');
    respondWrongFormat(res);
    return;
  }

  var action = 'make';
  var users = [];
  if (phrases[0].type === 'text')
  {
    action = phrases[0].value;
    phrases.shift();
  }
  else

  switch (action)
  {
    case 'make':
    case 'name':
    case 'rename':
    case 'create':
    {
      var users = [];
      var name = null;
      for (let i = 0; i < phrases.length; ++i)
      {
        if (phrases[i].type === 'user')
        {
          users.push({ id: phrases[i].id, name: phrases[i].name });
        }
        else if (phrases[i].type === 'text')
        {
          name = phrases[i].value;
          break;
        }
        else
        {
          var phrasetypes = [];
          phrases.forEach(p => phrasetypes.push(p.type));
          console.log(phrasetypes);
          respondWrongFormat(res);
          return;
        }
      }

      // ensure unique ids and 2+ ppl per team
      var ids = new Set();
      users.forEach(usr => ids.add(usr.id));
      if (users.length < 2 || ids.size != users.length)
      {
        console.log(users);
        respondWrongFormat(res);
        return;
      }

      database
        .AddTeam(users, name)
        .then(() =>
        {
          res.status(200).send({
            response_type: 'in_channel',
            text: `Created team: ${name}`
          });
          return;
        })
        .catch(error =>
        {
          res.status(500).send({ text: 'Something went wrong on our end', error });
        })
      break;
    }
    default:
    {
      console.log('invalid command');
      respondWrongFormat(res);
      return;
    }
  }
});

router.post('/game', (req, res) =>
{
  var phrases = [];
  try
  {
    phrases = parse(req.body.text);
  }
  catch
  {
    console.log('Parse failed');
    respondWrongFormat(res);
    return;
  }

  var whoWonText = null;
  var team1 = [];
  var team2 = [];
  var curTeam = team1;
  phrases.forEach(phrase =>
  {
    if (phrase.type === 'text' && curTeam === team1)
    {
      whoWonText = phrase.value;
      curTeam = team2;
    }
    else if (phrase.type === 'user')
    {
      curTeam.push({ id: phrase.id, name: phrase.name });
    }
  });

  var winVerbs = [
    'beat',
    'destroyed',
    'decimated',
    'slapped',
    'toasted',
    'smacked',
    'disrespected',
    'dissed',
    'slow rolled',
    'owned',
    'pwned',
    'killed',
    'pile-drived',
    'eye-gouged'
  ];

  var winners = null;
  var losers = null;
  for (let i = 0; i < winVerbs.length; ++i)
  {
    if (whoWonText === winVerbs[i])
    {
      winners = team1;
      losers = team2;
      break;
    }
    else if (whoWonText === 'got ' + winVerbs[i] + ' by')
    {
      winners = team2;
      losers = team1;
      break;
    }
  }

  if (!winners)
  {
    console.log('no winners', whoWonText)
    respondWrongFormat(res);
    return;
  }

  var is1v1 = winners.length == 1 && losers.length == 1;
  var is2v2 = winners.length == 2 && losers.length == 2;

  if (!is1v1 && !is2v2)
  {
    // Must be either a 2v2 game or 1v1 game
    console.log('#winners:' + winners.length + '#losers:' + losers.length);
    respondWrongFormat(res);
    return;
  }

  var userIDs = new Set();
  winners.forEach(user => userIDs.add(user.id));
  losers.forEach(user => userIDs.add(user.id));

  if (userIDs.size != winners.length + losers.length)
  {
    // Player appears multiple times in the game
    console.log('dupe id');
    respondWrongFormat(res);
    return;
}

  if (winners.length === 1)
  {
    database
      .AddSingleGame(winners[0], losers[0])
      .then(() =>
      {
        res.status(200).send({
          response_type: 'in_channel',
          text: 'Game recorded!'
        });
      })
      .catch(err =>
      {
        console.log(err);
        res.status(200).send({
          response_type: 'in_channel',
          text: 'Unable to record game!'
        });
      })
  }
  else
  {
    database
      .AddTeamGame(winners, losers)
      .then(() =>
      {
        res.status(200).send({
          response_type: 'in_channel',
          text: `Game recorded!`
        });
      })
      .catch(err =>
      {
        console.log(err)
        res.status(200).send({
          response_type: 'in_channel',
          text: 'Unable to record game!'
        });
      });
  }
});

router.post('/score', (req, res) =>
{
  var scoreType = req.body.text || 'combined';
  var getScores;
  switch (scoreType)
  {
    case 'combined':
    case 'combo':
    case 'both':
      getScores = database.GetCombinedScores();
      break;
    case 'solo':
    case 'single':
    case 'singles':
    case 'ones':
      getScores = database.GetSoloScores();
      break;
    case 'team':
    case 'teams':
    case 'doubles':
    case 'twos':
      getScores = database.GetTeamScores();
      break;
    default:
      respondWrongFormat(res);
      return;
  }

  getScores.then(scores =>
  {
    var nameColumnLen = scores.reduce((len, curVal) => Math.max(len, curVal.name.length), -1);
    nameColumnLen = Math.max(nameColumnLen, 15) + 5;

    const scoreColumnLen = 6

    var text =
      '```' +
      'Player' + ' '.repeat(nameColumnLen-6) +
      'Wins' + ' '.repeat(scoreColumnLen-4) +
      'Losses' + ' '.repeat(scoreColumnLen-6) +
      ' '.repeat(4) + '\n';

    scores.forEach(({name, wins, losses}) =>
    {
      wins = String(wins);
      losses = String(losses);
      text +=
        name + '.'.repeat(nameColumnLen-name.length) +
        wins + '.'.repeat(scoreColumnLen-wins.length) +
        losses + '.'.repeat(scoreColumnLen-losses.length + 4) +
        '\n';
    })

    text += '```';

    res.status(200).send({
      mrkdwn: true,
      text
    });
  });
});

module.exports = router;
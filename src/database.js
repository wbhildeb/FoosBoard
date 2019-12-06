const firebase = require('firebase');
const env = require('./environment');
const utils = require('./utils');

firebase.initializeApp(env.FIREBASE_INFO);

var db = firebase.firestore();

class CollectionRef
{
  static Users()
  {
    return db.collection('users');
  }

  static Teams()
  {
    return db.collection('teams');
  }

  static SoloGames()
  {
    return db.collection('solo-games');
  }

  static TeamGames()
  {
    return db.collection('team-games');
  }
}

class DocRef
{
  static User(userID)
  {
    return CollectionRef.Users().doc(userID);
  }

  /**
   * @param {string|User[]|string[]}
   */
  static Team(team)
  {
    if (!team) throw new Error('Argument undefined: team');

    var teamID = typeof team === 'string' ?
      team :
      Database.GetTeamID(team);

    return CollectionRef.Teams().doc(teamID);
  }

  static SoloGame(game)
  {
    return CollectionRef.SoloGames().doc(game);
  }

  static TeamGame(game)
  {
    return CollectionRef.TeamGames().doc(game);
  }
}


class Database
{
  static AddUser(user)
  {
    var userRef = DocRef.User(user.id);

    return new Promise((resolve, reject) =>
    {
      userRef
        .get()
        .then(snapshot =>
        {
          if (snapshot.exists)
          {
            const oldname = snapshot.data().name;
            if (oldname != user.name)
            {
              userRef
                .update({name: user.name})
                .then(() =>
                {
                  console.log(`Update user [${user.id}] name: ${oldname} -> ${user.name}`);
                  resolve();
                })
                .catch(reject);
            }
            resolve();
          }
          else
          {
            return userRef
              .set({name: user.name}, { merge: true })
              .then(() =>
              {
                console.log(`Create user [id: ${user.id}, name:${user.name}]`);
                resolve();
              })
              .catch(reject);
          }
        });
    });
  }

  /**
   * Adds the team's id to the users list of teams
   *  Creates the user if they don't already exist in the database
   * @param {User} user
   * @param {string} teamID
   * @returns {Promise<void>}
   */
  static LinkUserToTeam(user, teamID)
  {
    return this
      .AddUser(user)
      .then(() =>
      {
        return DocRef
          .User(user.id)
          .update({
            ['teams.' + teamID]: true
          });
      });
  }

  /**
   * Adds a game to the users list of games
   *   Adds user if they don't already exist in the database
   * @param {User} user
   * @param {string} gameID
   * @param {boolean} userWon
   * @param {boolean} solo true if solo game, false if team game
   * @param {Promise<void>}
   */
  static LinkUserToGame(user, gameID, userWon, solo)
  {
    const result = userWon ? 'wins' : 'losses';
    const division = solo ? 'solo' : 'team';

    return this
      .AddUser(user)
      .then(() =>
      {
        return DocRef
          .User(user.id)
          .update({
            [`games.${division}_${result}.${gameID}`]: true
          });
      });
  }

  /**
   *
   * @param {User[]} user
   * @param {string} gameID
   * @param {boolean} teamWon
   */
  static LinkTeamToGame(users, gameID, teamWon)
  {
    var teamID = this.GetTeamID(users);
    const category = teamWon ? 'wins' : 'losses';
    return this
      .AddTeam(users)
      .then(() =>
      {
        var promises = [
          DocRef
            .Team(teamID)
            .update({
              [`games.${category}.${gameID}`]: true
            })
            .then(() => {
              console.log(`Update team [id: ${teamID}] added ${teamWon ? 'win':'loss'} ${gameID}`);
            })
        ];

        users.forEach(user =>
          promises.push(this.LinkUserToGame(user, gameID, teamWon, false))
        );

        return Promise.all(promises);
      });
  }

  /**
   * Outputs the team id that would correspond to the given users
   * @param {string[]|User[]} users
   * @returns {string}
   */
  static GetTeamID(users)
  {
    var userIDs = users[0].id ?
      users.map(user => user.id) : users;

    userIDs.sort();
    var teamID = '';
    userIDs.forEach(id => teamID += id);
    return teamID;
  }

  /**
   *
   * @param {User[]} users
   * @param {string} teamName
   * @returns {Promise<void>}
   */
  static AddTeam(users, teamName)
  {
    return new Promise((resolve, reject) =>
    {
      const teamID = this.GetTeamID(users);
      const teamRef = DocRef.Team(teamID);

      var addUsers = [];
      users.forEach(user => {
        addUsers.push(this.LinkUserToTeam(user, teamID))
      });

      // Set a default team name from team members
      var nameIsDefault = !teamName;
      if (nameIsDefault)
      {
        teamName = '';
        users.forEach(user => {
          teamName += user.name + ' ';
        });
        teamName = teamName.trimEnd();
      }

      Promise
        .all(addUsers)
        .then(() =>
        {
          teamRef
            .get()
            .then(snapshot =>
            {
              if (snapshot.exists)
              {
                const oldname = snapshot.data().name;
                if (oldname === teamName || nameIsDefault)
                {
                  resolve();
                  return;
                }

                teamRef
                  .update({ name: teamName })
                  .then(() =>
                  {
                    console.log(`Update team [${teamID}] name: ${oldname} -> ${teamName}`);
                    resolve();
                  })
                  .catch(reject);
              }
              else
              {
                var members = {};
                users.forEach(user =>
                {
                  members[user.id] = true;
                });

                teamRef
                  .set({
                    name: teamName,
                    members
                  })
                  .then(() =>
                  {
                    console.log(`Create team [id: ${teamID}, name: '${teamName}']`);
                    resolve();
                  })
                  .catch(reject);
              }
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }

  /**
   * Adds a 1v1 game to the database
   *  - Creates users in the database is they do not exist
   * @param {User} winner
   * @param {User} loser
   */
  static AddSoloGame(winner, loser)
  {
    return CollectionRef
      .SoloGames()
      .add({
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        winner: winner.id,
        loser: loser.id
      })
      .then(docRef =>
      {
        console.log(`Create solo's game [id: ${docRef.id}, winner: ${winner.id}, loser: ${loser.id}]`);
        return Promise.all(
          [this.LinkUserToGame(winner, docRef.id, true, true),
          this.LinkUserToGame(loser, docRef.id, false, true)]
        );
      });
  }

  /**
   * Adds a game between two teams to the database
   *  - Creates the teams in the database if they do not exist
   * @param {User[]} winners
   * @param {User[]} losers
   */
  static AddTeamGame(winners, losers)
  {
    const winningTeamID = this.GetTeamID(winners);
    const losingTeamID = this.GetTeamID(losers);

    return Promise.all(
      [this.AddTeam(winners),
      this.AddTeam(losers)]
    ).then(() =>
    {
      return CollectionRef
        .TeamGames()
        .add({
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          winner: winningTeamID,
          loser: losingTeamID
        })
    })
    .then(docRef =>
    {
      console.log(`Create team game [id: ${docRef.id}, winner: ${winningTeamID}, loser: ${losingTeamID}]`);
      return Promise.all(
        [this.LinkTeamToGame(winners, docRef.id, true),
        this.LinkTeamToGame(losers, docRef.id, false)]
      );
    });
  }

  static GetScores(solo, team)
  {
    var scoreboard = [];
    return CollectionRef
      .Users()
      .get()
      .then(snapshot =>
      {
        snapshot.docs.forEach(snapshot => {
          var user = snapshot.data();

          if (user.games)
          {
            var soloWins = user.games.solo_wins ? Object.keys(user.games.solo_wins).length : 0;
            var soloLosses = user.games.solo_losses ? Object.keys(user.games.solo_losses).length : 0;
            var teamWins = user.games.team_wins ? Object.keys(user.games.team_wins).length : 0;
            var teamLosses = user.games.team_losses ? Object.keys(user.games.team_losses).length : 0;

            var wins = (solo ? soloWins : 0) + (team ? teamWins : 0);
            var losses = (solo ? soloLosses : 0) + (team ? teamLosses : 0);

            if (wins || losses)
            {
              scoreboard.push({
                name: user.name,
                wins,
                losses
              });
            }
          }
        });

        return scoreboard;
      });
  }

  static GetSoloScores()
  {
    return this.GetScores(true, false);
  }

  static GetCombinedScores()
  {
    return this.GetScores(true, true);
  }

  static GetTeamScores()
  {
    var scoreboard = [];
    return CollectionRef
      .Teams()
      .get()
      .then(snapshot =>
      {
        snapshot.docs.forEach(snapshot =>
        {
          var team = snapshot.data();
          if (team.games)
          {
            var wins = team.games.wins ? Object.keys(team.games.wins).length : 0;
            var losses = team.games.losses ? Object.keys(team.games.losses).length : 0;

            if (wins || losses)
            {
              scoreboard.push({
                name: team.name,
                wins,
                losses
              });
            }
          }
        });

        return scoreboard;
      });
  }
};

module.exports = Database;

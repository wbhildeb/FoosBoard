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

  static SingleGames()
  {
    return db.collection('single-games');
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

  static SingleGame(game)
  {
    return CollectionRef.SingleGames().doc(game);
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
              .set({name: user.name})
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
            teams: { [teamID]: true }
          });
      });
  }

  /**
   * Adds a game to the users list of games
   *   Adds user if they don't already exist in the database
   * @param {User} user
   * @param {string} gameID
   * @param {boolean} userWon
   * @param {boolean} single true if single game, false if team game
   * @param {Promise<void>}
   */
  static LinkUserToGame(user, gameID, userWon, single)
  {
    var gameCategory = single ? 'single_' : 'team_';
    gameCategory += userWon ? 'wins' : 'losses';

    return this
      .AddUser(user)
      .then(() =>
      {
        return DocRef
          .User(user.id)
          .update({
            games: { [gameCategory]: { [gameID]: true }}
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

    return this
      .AddTeam(users)
      .then(() =>
      {
        var promises = [
          DocRef
            .Team(teamID)
            .update({
              games: {
                [teamWon ? 'wins' : 'losses']:
                {
                  [gameID]: true
                }
              }
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
  static AddSingleGame(winner, loser)
  {
    return CollectionRef
      .SingleGames()
      .add({
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        winner: winner.id,
        loser: loser.id
      })
      .then(docRef =>
      {
        console.log(`Create singles game [id: ${docRef.id}, winner: ${winner.id}, loser: ${loser.id}]`);
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
      this.AddTeam(winners),
      this.AddTeam(losers)
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
        this.LinkUserToGame(losers, docRef.id, false)]
      );
    });
  }
};

module.exports = Database;

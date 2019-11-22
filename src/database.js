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
    var teamID = typeof team === 'string' ?
      team :
      Database.GetTeamID(team);

    return CollectionRef.Teams().doc(teamID);
  }
}



module.exports = class Database
{
  static AddUser(userID, name)
  {
    var userRef = DocRef.User(userID);

    return new Promise((resolve, reject) =>
    {
      userRef
        .get()
        .then(snapshot =>
        {
          if (snapshot.exists)
          {
            const oldname = snapshot.data().name; 
            if (oldname != name)
            {
              userRef
                .update({name})
                .then(() =>
                {
                  console.log(`Update user [${userID}] name: ${oldname} -> ${name}`);
                  resolve();
                });
            }
          }
          else
          {
            return userRef
              .set({name})
              .then(() =>
              {
                console.log(`Create user [id: ${userID}, name:${name}]`);
                resolve();
              });
          }
        });
    });
  }

  /**
   * Returns the members object that would be stored in a team for the given users
   * @param {string[] | User[]} users
   * @returns {Object}
   */
  static GetMembersObject(users)
  {
    if (!users || !users[0]) return {};
    
    var members = {};
    if (users[0].id)
    {
      // User objects
      users.forEach(user => { members[user.id] = true; });
    }
    else
    {
      // IDs
      users.forEach(id => { members[id] = true; });
    }

    return members;
  }

  static AddUserToTeam(user, teamID)
  {
    return new Promise((resolve, reject) =>
    {
      this
        .AddUser(user.id, user.name)
        .then(() =>
        {
          DocRef
            .User(user.id)
            .update({
              teams:
              {
                [teamID]: true
              }})
            .then(() =>
            {
              console.log(`Update user [id: ${user.id}] teams: added ${teamID}`);
              resolve();
            })
        });
    });
  }

  static GetTeamID(users)
  {
    var userIDs;
    if (team[0].id)
    {
      userIDs = team.map(user => user.id);
    }
    else
    {
      userIDs = team;
    }

    userIDs.sort();
    var teamID = '';
    userIDs.forEach(id => teamID += id);
  }

  static AddTeam(users, teamName)
  {
    if (!teamName)
    {
      // Set Default team name from team members
      teamName = '';
      users.forEach(user => {
        teamName += user.name + ' ';
      });
      teamName = teamName.trimEnd();
    }

    const teamID = this.GetTeamID(users);
    const teamRef = DocRef.Team(teamID); 

    return new Promise((resolve, reject) =>
    {
      teamRef
        .get()
        .then(snapshot =>
        {
          if (snapshot.exists && snapshot.data().name != teamName)
          {
            teamRef
              .update({ name: teamName })
              .then(() =>
              {
                console.log(`Update user [${userID}] name: ${oldname} -> ${name}`);
                resolve();
              });
          }
          else
          {
            const promises = [];
            promises.push(
              teamRef.set({
                name: teamName
              })
            );
            
            users.forEach(user =>
            {
              promises.push(this.AddUserToTeam(user, teamID));
            });

            Promise.all(promises).then(() =>
            {
              resolve();
            });
          }
        });
    });
  }
};
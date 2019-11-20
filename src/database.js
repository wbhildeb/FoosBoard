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
    if (!team) return Promise.reject('Empty param: team');

    if (typeof team === 'string')
    {
      return CollectionRef.Teams().doc(team);
    }

    var userIDs;
    if (!team[0]) return Promise.reject('Bad param: team');
    if (team[0].id)
    {
      userIDs = team.map(user => user.id);
    }
    else
    {
      userIDs = team;
    }

    userIDs.sort();

    return new Promise((resolve, reject) =>
    {
      DocRef
        .User(userIDs[0])
        .get()
        .then(
          snapshot => 
          {
            if (!snapshot.exists) reject('No team with given users');
            
            // Get all teams that the first user is on
            var teamPromises = [];
            Object
              .keys(snapshot.data().teams)
              .forEach(teamID =>
              {
                teamPromises.push(DocRef.Team(teamID).get())
              });
              
            Promise
              .all(teamPromises)
              .then(snapshots =>
              {
                // Go through each team and see if the members match the given users
                for (let i = 0; i < snapshots.length; ++i)
                {
                  if (snapshots[i].exists)
                  {
                    if (utils.ArraysEqual(userIDs, Object.keys(snapshots[i].data().members)))
                    {
                      resolve(snapshots[i].ref);
                    }
                    return;
                  }
                }

                resolve('Not team with given users');
              });
            },
            reject);
    });

  }

  /**
   * Returns the team with the specified users or undefined if none exists
   * @param {string[]|User[]} userIDs 
   * @returns {Promise<DatabaseReference>}
   */
  static GetTeamRef(userIDs)
  {
    
  }
}



module.exports = class Database
{
  static AddUser(userID, name)
  {
    var userRef = DocRef.User(userID);

    return userRef
      .get()
      .then(snapshot =>
      {
        if (snapshot.exists)
        {
          const oldname = snapshot.data().name; 
          if (oldname != name)
          {
            return userRef
              .update({name})
              .then(() => console.log(`Update user [${userID}] name: ${oldname} -> ${name}`));
          }
        }
        else
        {
          return userRef
            .set({name})
            .then(() => console.log(`Create user [id: ${userID}, name:${name}]`));
        }
      });
  }

  /**
   * Returns true if the user exists in the database
   * @param {string} userID 
   * @returns {Promise<boolean>}
   */
  static UserExists(userID)
  {
    return DocRef
      .User(userID)
      .get()
      .then(snapshot => 
      {
        return snapshot.exists;
      });
  }

  /**
   * Returns true if the team with the specified users exists
   * @param {string[]|User[]} users 
   * @returns {Promise<Team>}
   */
  static DoesTeamExist(users)
  {
    return this.GetTeam(users).then(val => !!val);
  }

  /**
   * Returns the team with the specified users or undefined if none exists
   * @param {string[]|User[]} userIDs 
   * @returns {Promise<DatabaseReference>}
   */
  static GetTeam(userIDs)
  {
    return new Promise((resolve, reject) =>
    {
      DocRef
        .Team(userIDs)
        .then(ref =>
        {
          ref
            .get()
            .then(snapshot =>
            {
              if (snapshot.exists)
                resolve(snapshot.data());
              else
                reject('Team does not exist');
            });
        })
        .catch(reject);
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

//   static AddTeam(users, teamName)
//   {
//     if (!teamName)
//     {
//       // Set Default team name from team members
//       teamName = '';
//       users.forEach(user => {
//         teamName += user.name + ' ';
//       });
//       teamName = teamName.trimEnd();
//     }

//     var members = {};
//     var promises = [];
//     users.forEach(user =>
//     {
//       // Ensure user exists
//       promises.push(this.AddUser(user.id, user.name));
//       members[user.id] = true;
//     });

//     // Await addition of all users
//     Promise
//       .all(promises)
//       .then(() =>
//       {

//       });


//     CollectionRef
//       .Teams()
//       .set({
//         name: teamName,
//         users: userIDs
//       });
//   }
};
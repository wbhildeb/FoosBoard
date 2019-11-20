const firebase = require('firebase');
const env = require('./environment');

firebase.initializeApp(env.FIREBASE_INFO);

var db = firebase.firestore();

class Database
{
  AddUser(userID, name)
  {
    var docRef = db.collection('users').doc(userID);

    docRef
      .get()
      .then(snapshot =>
      {
        if (snapshot.exists)
        {
          docRef.update({name});
        }
        else
        {
          docRef.set({name})
        }
      })
  }
}

module.exports = new Database();
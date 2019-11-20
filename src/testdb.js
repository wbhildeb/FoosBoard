const env = require('./environment');
const db = require('./database');

db.AddUser('U0000', 'Patient 0')
  .then(() => db.AddUser('U0001', 'Patient One'))
  .then(() => db.AddUser('U0000', 'Patient Zero'))
  .then(() => db.AddUser('U0000', 'Patient Zero'));

db.GetTeam([{ id: 'U0000'}, { id: 'U0001'}]).then(console.log);
// db.AddTeam(['U0000', 'U0001'], 'The Patients');

// console.log(env.DEBUG);

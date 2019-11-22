const env = require('./environment');
const db = require('./database');

// db.AddUser('U0000', 'Patient 0')
//   .then(() => db.AddUser('U0001', 'Patient One'))
//   .then(() => db.AddUser('U0000', 'Patient Zero'))
//   .then(() => db.AddUser('U0000', 'Patient Zero'));

db.AddTeam([ {id: 'U0000', name: 'Patient Zero'}, {id: 'U0001', name: 'Patient One'} ], 'The Patience')
  .then(
    () => db.AddTeam([ {id: 'U0000', name: 'Patient Zero'}, {id: 'U0001', name: 'Patient One'} ], 'The Patients')
);
const express= require('express');
const foos = require('../src/foosboard');

var app = express();
app.use(foos);

app.listen(3000);
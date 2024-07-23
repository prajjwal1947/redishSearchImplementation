const express = require('express');
const bodyParser = require('body-parser');
const bookRoutes = require('./router/bookRoutes');

const app = express();
app.use(bodyParser.json());
app.use('/api/books', bookRoutes);

module.exports = app;

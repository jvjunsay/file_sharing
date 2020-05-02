// call all the required packages
const express = require('express');
const bodyParser = require('body-parser');
const cron = require("node-cron");

const cors = require('cors');
const router = require('./router');
require('dotenv').config({ path: __dirname + '/.env' });

//CREATE EXPRESS APP
const app = express();
app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));

//ROUTES WILL GO HERE
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});


router(app, cron);

//HANDLE DEFAULT ERRORS
function errorHandler(err, req, res, next) {
  res.status(err.httpStatusCode).send({ success: false, error: err.message });
}

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening to: ${PORT}`);
});

module.exports = app;
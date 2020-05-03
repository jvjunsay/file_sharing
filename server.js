// call all the required packages
const express = require('express');
const bodyParser = require('body-parser');
const cron = require("node-cron");

const cors = require('cors');
const router = require('./router');
require('dotenv').config({ path: __dirname + '/.env' });

//Create Express App
const app = express();
app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));

//Routes Will Go Here
router(app, cron);

//Handle Default Errors
function errorHandler(err, req, res, next) {
  res.status(err.httpStatusCode).send({ success: false, error: err.message });
}

app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening to: ${PORT}`);
});

module.exports = app;
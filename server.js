// call all the required packages
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
require('dotenv').config({ path: __dirname + '/.env' });
const randomString = require('crypto-random-string');
const fs = require('fs');
const _ = require('lodash');

let dbData = JSON.parse(fs.readFileSync('db.json'));

//CREATE EXPRESS APP
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
var upload = multer({ dest: process.env.FOLDER });

//ROUTES WILL GO HERE
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/files', (req, res) => {
  res.json(dbData.files);
});

app.delete('/files/:privateKey', (req, res) => {
  const mFile = _.find(dbData.files, { id: req.params.privateKey });
  fs.unlinkSync(mFile.path);

  _.remove(dbData.files, { id: mFile.id });

  console.log(dbData);

  fs.writeFileSync('db.json', JSON.stringify(dbData));
  res.json({ success: true, message: 'File was successfully deleted.' });
});

app.get('/files/:publicKey', (req, res) => {
  const mFile = _.find(dbData.files, { publicKey: req.params.publicKey });
  res.setHeader('content-type', mFile.mimetype);
  fs.createReadStream(mFile.path).pipe(res);
});

app.post('/files', upload.single('test_file'), (req, res, next) => {
  const file = req.file;
  if (!file) {
    const error = new Error('Please upload a file');
    error.httpStatusCode = 400;
    return next(error);
  }

  try {
    const publicKey = randomString(5);
    dbData.files.push({
      id: file.filename,
      publicKey,
      timestamp: new Date().getTime(),
      ipAddress: req.ip,
      path: file.path,
      mimetype: file.mimetype,
      originalName: file.originalname,
    });

    fs.writeFileSync('db.json', JSON.stringify(dbData));
    res.send({
      success: true,
      message: 'File was uploaded successfully',
      privateKey: file.filename,
      publicKey,
    });
  } catch (e) {
    res.status(400).send(e);
  }
});

function errorHandler (err, req, res, next) {
  res.status(err.httpStatusCode).send({ success:false, error: err.message })
}

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening to: ${PORT}`);
});

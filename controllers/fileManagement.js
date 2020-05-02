const randomString = require('crypto-random-string');
const fs = require('fs');
const _ = require('lodash');
require('dotenv').config({ path: __dirname + '/.env' });

let dbData = JSON.parse(fs.readFileSync('db.json'));

const getTodaysData = (data) => {
  return _.filter(data, (data) => {
    const currDate = new Date();
    const uploadDate = new Date(data.timestamp);

    return (
      currDate.getDate() +
        '/' +
        (currDate.getMonth() + 1) +
        '/' +
        currDate.getFullYear() ==
      uploadDate.getDate() +
        '/' +
        (uploadDate.getMonth() + 1) +
        '/' +
        uploadDate.getFullYear()
    );
  });
};

const removeFiles = function (dirPath) {
  try {
    var files = fs.readdirSync(dirPath);
  } catch (e) {
    return;
  }
  if (files.length > 0)
    for (var i = 0; i < files.length; i++) {
      var filePath = dirPath + '/' + files[i];
      if (fs.statSync(filePath).isFile()) fs.unlinkSync(filePath);
      else dir(filePath);
    }
};

exports.getAllFiles = (req, res) => {
  res.json(dbData.files);
};

exports.deleteFile = (req, res) => {
  const mFile = _.find(dbData.files, { id: req.params.privateKey });
  fs.unlinkSync(mFile.path);

  _.remove(dbData.files, { id: mFile.id });

  console.log(dbData);

  fs.writeFileSync('db.json', JSON.stringify(dbData));
  res.json({ success: true, message: 'File was successfully deleted.' });
};

exports.getFile = (req, res, next) => {
  const files = getTodaysData(dbData.downloads);
  if (files.length >= process.env.DOWNLOAD_LIMIT) {
    const error = new Error('Download Limit Reached');
    error.httpStatusCode = 400;
    return next(error);
  }

  const mFile = _.find(dbData.files, { publicKey: req.params.publicKey });

  dbData.downloads.push({
    timestamp: new Date().getTime(),
    ipAddress: req.ip,
  });
  fs.writeFileSync('db.json', JSON.stringify(dbData));

  res.setHeader('content-type', mFile.mimetype);
  fs.createReadStream(mFile.path).pipe(res);
};

exports.uploadFile = (req, res, next) => {
  const files = getTodaysData(dbData.files);

  if (files.length >= process.env.UPLOAD_LIMIT) {
    const error = new Error('Upload Limit Reached');
    error.httpStatusCode = 400;
    return next(error);
  }

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
};

exports.runJob = () => {
  if (dbData.files.length > 0) {    
    const last = _.last(dbData.files);
    const mDate = new Date();
    const daysAgoTimeStamp = mDate.setDate(mDate.getDate() - process.env.INACTIVITY_PERIOD);
    if(last.timestamp < daysAgoTimeStamp) {
        removeFiles('uploads');
    }
  }
};

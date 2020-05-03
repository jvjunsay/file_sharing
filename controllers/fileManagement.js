// call all the required packages
const AWS = require('aws-sdk');
const randomString = require('crypto-random-string');
const fs = require('fs');
const _ = require('lodash');
const config = require('../config');
require('dotenv').config({ path: __dirname + '/.env' });

// Set AWS Credentials
AWS.config.update({
  accessKeyId: config.aws_key_id,
  secretAccessKey: config.aws_secret,
  region: config.region,
});

//Create New Instance of S3
const awsStorage = new AWS.S3();

//Initialize JSON DB
let dbData = JSON.parse(fs.readFileSync('db.json'));

/**
 * Fetch todays Data
 * @param {} Data fetched from our JSON DB
 */
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

/**
 * Insert uploaded file to DB
 * @param  file
 * @param  publicKey
 * @param  ipAddress
 * @param  storage
 */
const inserDataToDB = (file, publicKey, ipAddress, storage) => {
  try {
    dbData.files.push({
      id: file.filename,
      publicKey,
      timestamp: new Date().getTime(),
      ipAddress,
      path: file.path,
      mimetype: file.mimetype,
      originalName: file.originalname,
      storage,
    });

    // Overwrite JSON DB with new JSON Object
    fs.writeFileSync('db.json', JSON.stringify(dbData));
  } catch (e) {
    const error = new Error(e.message);
    error.httpStatusCode = 400;
    throw error;
  }
};

/**
 * Remove all files from directory when there is no activity
 * @param dirPath Path of dir to remove
 */
const removeFiles = (dirPath) => {
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

/**
 * removes File from S3 Bucket
 * @param fileName 
 * @param res 
 */
const removeFilesAWSStorage = (fileName, res) => {
  // set the params needed for s3
  const params = {
    Bucket: config.bucket,
    Key: fileName,
  };

  // Call function to delete file
  awsStorage.deleteObject(params, (err, data) => {
    if (err) {
      const error = new Error(err.message);
      error.httpStatusCode = 400;
      throw error;
    } else {
      _.remove(dbData.files, { id: fileName });
      fs.writeFileSync('db.json', JSON.stringify(dbData));

      return res.json({
        success: true,
        message: 'File was successfully deleted.',
      });
    }
  });
};

/**
 * Upload File to AWS S3 Bucket
 * @param file 
 * @param reqDetails 
 * @param res 
 * @param next 
 */
const uploadToAWSStorage = (file, reqDetails, res, next) => {
  // check if file is existing in local storage
  fs.readFile(file.path, (err, fileData) => {
    // if file exist
    if (!err) {
      // set the params needed for s3
      const params = {
        Bucket: config.bucket,
        Key: file.filename,
        Body: fileData,
      };

      // call S3 upload function
      awsStorage.putObject(params, (err, data) => {
        if (err) {
          console.log('Could not upload file');
          const error = new Error('Could not upload file');
          error.httpStatusCode = 400;
          return next(error);
        } else {
          // remove local file
          fs.unlinkSync(file.path);

          //insert to database 
          inserDataToDB(file, reqDetails.publicKey, reqDetails.ipAddress, 's3');

          // return a response to the client
          return res.send({
            success: true,
            message: 'File was uploaded successfully to AWS S3',
            privateKey: file.filename,
            publicKey: reqDetails.publicKey,
          });
        }
      });
    } else {
      console.log(err);
    }
  });
};

/**
 * retrieve a file from AWS S3 Bucket
 * @param fileName 
 * @param res 
 */
const retrieveFileAWSStorage = (fileName, res) => {
  const params = {
    Bucket: config.bucket,
    Key: fileName,
  };

  // call function for retrieving file 
  awsStorage.getObject(params, (err, data) => {
    if (err) {
      const error = new Error(err.message);
      error.httpStatusCode = 400;
      throw error;
    } else {
      return res.send(data.Body);
    }
  });
};

/**
 * get all files handler
 */
exports.getAllFiles = (req, res) => {
  res.json(dbData.files);
};


/**
 * Delete File Handler
 */
exports.deleteFile = (req, res) => {
  const mFile = _.find(dbData.files, { id: req.params.privateKey });

  //check if file is uploaded to aws or local
  if (mFile.storage === 's3') {
    removeFilesAWSStorage(mFile.id, res);
  } else {
    fs.unlinkSync(mFile.path);
    res.json({ success: true, message: 'File was successfully deleted.' });
  }
};

/**
 * Get File Handler
 */
exports.getFile = (req, res, next) => {
  // fetch files todays uploaded files
  const files = getTodaysData(dbData.downloads);

  //check if download limit is reached
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

  // check if the file is uploaded to S3 or local
  if (mFile.storage === 's3') {
    retrieveFileAWSStorage(mFile.id, res);
  } else {
    fs.createReadStream(mFile.path).pipe(res);
  }
};


/** 
 * Upload File Handler
 */
exports.uploadFile = (req, res, next) => {
  const files = getTodaysData(dbData.files);

  //generate publicKey
  const publicKey = randomString(5);

  // check if upload limit is reached
  if (files.length >= process.env.UPLOAD_LIMIT) {
    const error = new Error('Upload Limit Reached');
    error.httpStatusCode = 400;
    return next(error);
  }

  //check if file is attached
  const file = req.file;
  if (!file) {
    const error = new Error('Please upload a file');
    error.httpStatusCode = 400;
    return next(error);
  }

  // check if the file is uploaded to s3 or local
  if (req.body.storage === 's3') {
    uploadToAWSStorage(file, { publicKey, ipAddress: req.ip }, res, next);
  } else {
    inserDataToDB(file, publicKey, req.ip, 'local');
    res.send({
      success: true,
      message: 'File was uploaded successfully',
      privateKey: file.filename,
      publicKey,
    });
  }
};

/**
 * Job Handler
 */
exports.runJob = () => {
  if (dbData.files.length > 0) {
    const last = _.last(dbData.files);
    const mDate = new Date();
    const daysAgoTimeStamp = mDate.setDate(
      mDate.getDate() - process.env.INACTIVITY_PERIOD
    );
    if (last.timestamp < daysAgoTimeStamp) {
      removeFiles('uploads');
    }
  }
};

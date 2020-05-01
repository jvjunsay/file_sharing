// call all the required packages
const express = require('express')
const bodyParser= require('body-parser')
const multer = require('multer');
require('dotenv').config({path: __dirname + '/.env'})
const randomString = require('crypto-random-string');
const fs = require('fs');
const _ = require('lodash')
 
let dbData = JSON.parse(fs.readFileSync('db.json'));

//CREATE EXPRESS APP
const app = express();

app.use(bodyParser.urlencoded({extended: true})) 
var upload = multer({ dest: process.env.FOLDER })
 
//ROUTES WILL GO HERE
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');  
});



app.post('/files', upload.single('test_file'), (req, res, next)=> {
  const file = req.file
  if (!file) {
    const error = new Error('Please upload a file')
    error.httpStatusCode = 400
    return next(error)
  }

  try {

    const publicKey = randomString(5)
    dbData.files.push({
      id: file.filename,
      publicKey,
      timestamp : new Date().getTime(),
      ipAddress: req.ip
    })

    fs.writeFileSync('db.json', JSON.stringify(dbData))
    res.send({
      privateKey: file.filename,
      publicKey
    })
  } catch (e) {
    console.log(e);
  }
    
})

console.log(process.env);
 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening to: ${PORT}`);
});
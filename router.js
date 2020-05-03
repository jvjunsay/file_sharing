// call all the required packages
const multer = require('multer');
require('dotenv').config({ path: __dirname + '/.env' });
const fileManagement = require('./controllers/fileManagement');

const upload = multer({ dest: process.env.FOLDER });

module.exports = function (app, cron) {

  // Return the HTML Page for the UI
  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
  });

  // Upload File Route
  app.post('/files', upload.single('test_file'), fileManagement.uploadFile);

  /**
   * Fetch / Download File Route
   * @param publicKey -- data returned from upload file
   */
  app.get('/files/:publicKey', fileManagement.getFile);

  // Fetch All Files Route
  app.get('/files', fileManagement.getAllFiles);

  // Delete File Route
  app.delete('/files/:privateKey', fileManagement.deleteFile);

  // job that runs every night to delete files if there is inactivity
  cron.schedule("59 23 * * *", function() {
    fileManagement.runJob();
  });
};


const multer = require('multer');
require('dotenv').config({ path: __dirname + '/.env' });
const fileManagement = require('./controllers/fileManagement');

const upload = multer({ dest: process.env.FOLDER });

module.exports = function (app, cron) {
  app.post('/files', upload.single('test_file'), fileManagement.uploadFile);
  app.get('/files/:publicKey', fileManagement.getFile);
  app.get('/files', fileManagement.getAllFiles);
  app.delete('/files/:privateKey', fileManagement.deleteFile);

  cron.schedule("59 23 * * *", function() {
    fileManagement.runJob();
  });
};


const assert = require("assert");
const app = require("../server");
const req = require('supertest-as-promised').agent(app);

//Test for getting all files
describe('GET', function(){
    it('files route should have success code 200', function(done){
        req.get('/files')
        .send({'storage': 'local'})
        .expect(200)
        .end(function(err,res){
            if(err) done(err);
            done();
        })
    })
});

// Test for uploading file
describe('POST', function(){
    it('file upload should have success code 200', function(done){
        req.post('/files')        
        .field({'storage': 'local'})
        .attach('test_file', __dirname + '/test_file.pdf')
        .expect(200)
        .end(function(err,res){
            if(err) done(err);
            done();
        })
    })
});

/**
 * Test Download Route
 * Upload File first to get public key
 * Continue testing the download route
 */
describe('GET', function(){
    it('file download should have success code 200', function(done){
        req.post('/files')
        .field({'storage': 'local'})
        .attach('test_file', __dirname + '/test_file.pdf')
        .expect(200)
        .end(function(err,res){
            if(err) done(err);
            const publicKey = res.body.publicKey
            req.get('/files/' + publicKey)
            .expect(200)
            .end(function(err,res){
                if(err) done(err);
                done();
            })
        })
    })
});


/**
 * Test Delete Route
 * Upload File first to get private key
 * Continue testing the delete route
 */
describe('GET', function(){
    it('file delete should have success code 200', function(done){
        req.post('/files')    
        .field({'storage': 'local'})
        .attach('test_file', __dirname + '/test_file.pdf')
        .expect(200)
        .end(function(err,res){
            if(err) done(err);
            console.log(res.body)
            const privateKey = res.body.privateKey
            req.delete('/files/' + privateKey)
            .expect(200)
            .end(function(err,res){
                if(err) done(err);
                done();
            })
        })
    })
});


const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bodyParser = require('body-parser');
const {google} = require('googleapis');
const app = express();
const port = process.env.PORT || 8081;
const options = {
    inflate: true,
    limit: '500kb',
    type: 'application/octet-stream'
};

app.use(cors());
app.use(bodyParser.raw(options));

require('dotenv').config();

const WRITE_BACK_FILE_NAME = process.env.WRITE_BACK_FILE_NAME || 'Location Table - POC.xlsx';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
 function authorize(credentials, callback, res = {send: () => {}}, code = '') {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);
  
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return getAccessToken(oAuth2Client, callback, res, code);
      oAuth2Client.setCredentials(JSON.parse(token));
      callback(oAuth2Client);
      res.send('App ready to go!')
    });
}
  
/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback, res = null, code = '') {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    if(code === ''){
        res.send(`Authorize this app by visiting this url: ${authUrl}`)
    }
    else {
        oAuth2Client.getToken(code, (err, token) => {
            if (err) {
                console.error('Error retrieving access token', err);
                res.send('Unable to initialize app.')
            }
            else{
                oAuth2Client.setCredentials(token);
                // Store the token to disk for later program executions
                fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                    if (err) return console.error(err);
                    console.log('Token stored to', TOKEN_PATH);
                });
                callback(oAuth2Client);
                res.send('All set!');
            }
        });
    }
}

app.get('/', (req, res) => {
    authorize(JSON.parse(process.env.GOOGLE_CREDENTIALS), (auth) => {}, res);
});

app.get('/code/:code', (req, res) => {
    authorize(JSON.parse(process.env.GOOGLE_CREDENTIALS), (auth) => {}, res, req.params.code);
});

app.put('/writeback', (req, res) => {
    fs.writeFile(`./${WRITE_BACK_FILE_NAME}`, req.body, (err) => {
        if(err){
            console.log(err);
            res.send('Write back failed!');
        }
        else{
            // Authorize a client with credentials, then call the Google Drive API.
            authorize(JSON.parse(process.env.GOOGLE_CREDENTIALS), (auth) => {
                const drive = google.drive({version: 'v3', auth});
                drive.files.list({
                    pageSize: 1000,
                    fields: 'nextPageToken, files(id, name)',
                }, (err, res) => {
                    if (err) return console.log('The API returned an error: ' + err);
                    const files = res.data.files;
                    if (files.length) {
                        files.map(async (file) => {   
                            if(file.name === WRITE_BACK_FILE_NAME){
                                console.log(`${file.name} (${file.id})`);
                                const res = await drive.files.update({
                                    fileId: file.id,
                                    media: {
                                        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                        body: fs.createReadStream(`./${WRITE_BACK_FILE_NAME}`),
                                    },
                                });
                                console.log(res.data);
                            }
                        });
                    } else {
                        console.log('No files found.');
                    }
                })
            });
            res.send('Write back succeeded!');
        } 
    });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const port = 8081;
const options = {
    inflate: true,
    limit: '500kb',
    type: 'application/octet-stream'
};

const WRITE_BACK_FILE_PATH = process.env.WRITE_BACK_FILE_PATH || 'Location Table - POC.xlsx';

app.use(cors());
app.use(bodyParser.raw(options));

app.put('/writeback', (req, res) => {
    fs.writeFile(WRITE_BACK_FILE_PATH, req.body, (err) => {
        if(err){
            console.log(err);
            res.send('Write back failed!');
        }
        else{
            res.send('Write back succeeded!');
        }
        
    });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
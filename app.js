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

app.use(cors());
app.use(bodyParser.raw(options));

app.put('/writeback', (req, res) => {
    fs.writeFile('Location Table - POC.xlsx', req.body, (err) => {
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
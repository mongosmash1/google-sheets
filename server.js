// server.js
// where your node app starts
var google = require('googleapis');
var sheets = google.sheets('v4');
var plus = google.plus('v1');
var userName;
var dataDeets;

// the process.env values are set in .env
var clientID = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;
var callbackURL = 'https://'+process.env.PROJECT_DOMAIN+'.glitch.me/login/google/return';
var scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly',
              'https://www.googleapis.com/auth/plus.login'];
var oauth2Client = new google.auth.OAuth2(clientID, clientSecret, callbackURL);

var url = oauth2Client.generateAuthUrl({
  // 'online' (default) or 'offline' (gets refresh_token)
  access_type: 'online',
  // If you only need one scope you can pass it as a string
  scope: scopes
});

// init project
var express = require('express');
var app = express();
var expressSession = require('express-session');

// cookies are used to save authentication
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
app.use(express.static('views'))
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(expressSession({ secret:'watchingmonkeys', resave: true, saveUninitialized: true }));

// index route
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

// on clicking "logoff" the cookie is cleared
app.get('/logoff',
  function(req, res) {
    res.clearCookie('google-auth');
    res.redirect('/');
  }
);

app.get('/auth/google', function(req, res) {
  res.redirect(url);
});

app.get('/login/google/return', function(req, res) {
    oauth2Client.getToken(req.query.code, function (err, tokens) {
      // Tokens contains an access_token and a refresh_token if you set access type to offline. Save them.
      if (!err) {
        oauth2Client.setCredentials({
          access_token: tokens.access_token
        });
        res.redirect('/setcookie');
      } else {
        console.log("Aww, man: " + err);
      }
    });
  }
);

// on successful auth, a cookie is set before redirecting
// to the success view
app.get('/setcookie',
  function(req, res) {
    res.cookie('google-auth', new Date());
    res.redirect('/success');
  }
);

// if cookie exists, success. otherwise, user is redirected to index
app.get('/success',
  function(req, res) {
    if(req.cookies['google-auth']) {
      res.sendFile(__dirname + '/views/success.html');
    } else {
      res.redirect('/');
    }
  }
);

app.get('/getData',
  function(req, res) {
    // Get Google+ details
    plus.people.get({
      userId: 'me',
      auth: oauth2Client
    }, function (err, response) {
      if (err) {
        console.log("Aww, man: " + err);
        res.send("An error occurred");
      } else { 
        if(response.isPlusUser==true){
          userName = response.name.givenName;
        } else {
          userName = "Unknown Stranger";        
        }

        // Now get spreadsheet values
        var request = {
          // The ID of the spreadsheet to retrieve data from.
          spreadsheetId: process.env.SHEET_KEY,
          // The A1 notation of the values to retrieve.
          range: 'A1:K11', 
          auth: oauth2Client
        };
        sheets.spreadsheets.values.get(request, function(err, response) {
          if (err) {
            console.log("Aww, man: " + err);
            res.send("An error occurred");
          } else {
            dataDeets = response.values;
            res.send([userName, dataDeets]);
          }
        });
      }
    });
  }
);

// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

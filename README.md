# Integrating WAX Expresstrade using Node.js
This tutorial is intended to teach how to integrate WAX Expresstrade, into any Node.js socket based web application, with preexisting basic knowledge about coding and serverstructure. 
The explanations in this tutorial is also build upon implying, that you have previous knowledge or experience with developing or dealing with applications using the Steam Web API.

## Content
Throughout this tutorial, we'll be using the following:

- At least one [Opskins account](https://opskins.com/?loc=login&register) with a registered API key, and its 2FA code.  
One account can hold unlimited amounts of digital items, so it's no longer required to have one account per 1000 items, as it was when Steam bots were required to run an online trading and or gambling platform. It still might be a good idea to have more than one bot account, to improve server performance. This tutorial uses only one account.

- [Node.js](https://nodejs.org/en/) and NPM for managing packages  
I suggest using Node.js 8.9.4 or higher for the best possible stability and package support

- [Socket.io](https://socket.io/) (Or other real-time engine, if you prefer that)

- The following Node.js modules:
  - [Express](https://www.npmjs.com/package/express)
  - [Expresstrade](https://www.npmjs.com/package/expresstrade)
  - [Opskins-OAuth](https://www.npmjs.com/package/opskins-oauth)
  - [Passport](https://www.npmjs.com/package/passport) 
  - [Passport-custom](https://www.npmjs.com/package/passport-custom)
  - [Fs](https://www.npmjs.com/package/file-system)

- [Trade.opskins.com](https://github.com/OPSkins/trade-opskins-api) API documentation

## Server basics
Before we're getting into handling the API and start sending requests, we'll need a basic and stable Node.js server.  
I recommend running it over https, with a free ssl certificate from [Letsencrypt](https://letsencrypt.org/). If you prefer running it non-secure for some reason, or dont wanna register a certificate, you can just run a simple http server.

Below is my example of a basic Node.js server.
```javascript
var https = require('https');
var fs = require('fs');

// Server listen and ssl 
var app = require('express')();
var server = https.createServer({
    key: fs.readFileSync('/PATH_TO_YOUR_PRIVATEKEY/privkey.pem'),
    cert: fs.readFileSync('/PATH_TO_YOUR_CHAIN/fullchain.pem')
},app);
server.listen(3000);
var io = require('socket.io').listen(server);
```

## Configuring Expresstrade and Opskins user authentication
To be able to fetch user data, and send requests using the Opskins Trade API, we'll need to configure both the Express trade service and the Opskins user authentication API.

Below is the commopn way to do so.
```javascript
// Our special modules
const ExpressTrade = require('expresstrade');
const CustomStrategy = require('passport-custom');
const opAuth = require('opskins-oauth');

// Creating a new Expresstrade session
const ET = new ExpressTrade({
  apikey: 'YOUR_APIKEY',
  twofactorsecret: 'THE_2FA_CODE_TO_THE_SAME_ACCOUNT_AS_THE_APIKEY',
  pollInterval: 'HOW_OFTEN_YOU_WANT_TO_POLL' // In ms, example "5000".
});

// Delcaring basic site info, and creating an Opskins session.
let OpskinsAuth = new opAuth.init({
    name: 'YOUR_SITE_NAME', // Site name displayed to users on logon
    returnURL: 'http://YOURDOMAIN.COM/auth/opskins/authenticate', // Your return route
    apiKey: 'YOUR_APIKEY', // OPSkins API key
    scopes: 'identity deposit withdraw', // Scopes you want to access, read more at https://docs.opskins.com/public/en.html#scopes.
    mobile: true // Removes login navbar if true
});

// Authenticating the user
passport.use('custom', new CustomStrategy(function (req, done) {
    OpskinsAuth.authenticate(req, (err, user) => {
        if (err) {
            done(err);
        } else {
            done(null, user);
        }
    });
}));

/* Routes */
// Redirect user to login.
app.get('/auth/opskins', function (req, res) {
	res.redirect(OpskinsAuth.getFetchUrl());
});
// Authenticate user when trying to login
app.get('/auth/opskins/authenticate', passport.authenticate('custom', {
	failureRedirect: '/'
}), function (req, res) {
	res.redirect('/');
});
```
The routes leading to the authentication code above, means that you must redirect your user to "YOURDOMAIN.COM/auth/opskins", to make it possible for them, to send a login request.

## Inventories and caching
When you've created the basics of your website, with WAX Expresstrade integrated, you probably want to load either your own, your user's or both inventories.  
Depending on how often you want to load an inventory, it might be a good idea to store each load as a cache, to reduce stress, improve loadtime and minimize the chances of a network request cooldown.  
This can be stored either in a database, or in a simple object array, or a more advanced in-memory data structure, such as [Redis](https://redis.io/).

Below is demonstrated the basics of how to load inventories.  
In [inventories.js](#inventories.js) is demonstrated how to load and cache inventories, depending on a refreshbuffer and a force refresh.

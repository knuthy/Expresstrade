# Integrating WAX Expresstrade using Node.js
This tutorial is intended to teach how to integrate WAX Expresstrade, into any Node.js socket based web application, with preexisting basic knowledge about coding and serverstructure. 
The explanations in this tutorial is also build upon implying, that you have previous knowledge or experience with developing or dealing with applications using the Steam Web API.

## Content
Throughout this tutorial, we'll be using the following:

- At least one [Opskins account](https://opskins.com/?loc=login&register) with a registered API key.  
One account can hold unlimited amounts of digital items, so it's no longer required to have one account per 1000 items, as it was when Steam bots were required to run an online trading and or gambling platform. It still might be a good idea to have more than one bot account, to improve server performance.

- [Node.js](https://nodejs.org/en/) and NPM for managing packages  
I suggest using Node.js 8.9.4 or higher for the best possible stability and package support

- [Socket.io](https://socket.io/) (Or other real-time engine, if you prefer that)

- The following Node.js modules:
  - [Express](https://www.npmjs.com/package/express)
  - [Expresstrade](https://www.npmjs.com/package/expresstrade)
  - [Fs](https://www.npmjs.com/package/file-system)

- [Trade.opskins.com]https://github.com/OPSkins/trade-opskins-api API documentation

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




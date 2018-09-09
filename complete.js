var https = require('https');
var fs = require('fs');
var socket = require('socket.io');
const ExpressTrade = require('expresstrade');
const passport = require('passport');
const CustomStrategy = require('passport-custom');
const opAuth = require('opskins-oauth');
// Cache
var cachedInventories = [];
var cachedInventory = [];

// Server listen and ssl 
var app = require('express')();
var server = https.createServer({
    key: fs.readFileSync('/PATH_TO_YOUR_PRIVATEKEY/privkey.pem'),
    cert: fs.readFileSync('/PATH_TO_YOUR_CHAIN/fullchain.pem')
},app);
server.listen(3000);
var io = socket.listen(server);

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
// Our home, making it possible to fetch userdata from the clientside.
app.get('/', function (req, res) {
    // Send res.user information. Example: res.end('info');
});
// We also want the user to be able to logout again.
app.get('/logout', (req, res) => {
	req.logout();
	res.redirect('/');
});

ET.on('offerAccepted', offer => {
	// Handle the data however you would like
	console.log(`Tradeoffer: offer.id has been accepted`);
});

ET.on('offerReceived', (_offer) => {
	console.log(`Tradeoffer: _offer.id incoming`)
	// Cancel all incoming tradeoffers.
	ET.ITrade.CancelOffer({offer_id: _offer.id})
});

io.on('connection', socket => {
	var user;
	// If logged in, assign userdata to socket session variable
	if (socket.handshake.session.passport && socket.handshake.session.passport.user) {
		user = socket.handshake.session.passport.user;
	}
	
	// User inventories
	socket.on('loadUserInventory', function(forceRefresh) {
		var cache;
		var inventoryCache;
		
		// Is the user's inventory already cached?
		cachedInventories.forEach(function(inventory) {
			if (inv.steamId == user.id64) {
				cache = true;
				inventoryCache = inventory.inv;
			}
		});
		
		// If the user doesn't want a force refresh, we're sending the cached inventory.
		if (!forceRefresh && cache) {
			socket.emit('userInventory', {
				content: inventoryCache
			});
		} else {
			// Removing the old cached inventory
			clearInventory(user.id64);
			ET.ITrade.GetUserInventoryFromSteamId({steam_id: user.id64}, (err, body) => {
				if (err) {
					return;
				} else {
					if (body.status == 1) {
						// Inventory loaded successfully
						var inventory = [];
						body.response.items.forEach(function(item) {
							inventory.push({
								id: item.id,
								category: item.category,
								name: item.name,
								img: item.image['600px'],
								color: item.color,
								price: item.suggested_price
							});
						});
						socket.emit('userInventory', {
							content: inventory
						});
						// Caching the newly loaded inventory
						cachedInventories.push({
							steamId: user.id64,
							inv: inventory,
							time: Date.now(),
							cache: true
						});
					} else {
						// Inventory could not load
						socket.emit('error', {
							content: 'INVENTORY_COULD_NOT_LOAD'
						});
					}
				}
			});
		}
	});
	
	// Own inventory
	socket.on('loadBotInventory', function(forceRefresh) {
		var cache;
		var inventoryCache;
		
		// Is the bot's inventory already cached?
		if (cachedInventory.cache) {
			cache = true;
			inventoryCache = inventory.inv;
		}
		
		// If the user doesn't want a force refresh, we're sending the cached inventory.
		if (!forceRefresh && cache) {
			socket.emit('ownInventory', {
				content: inventoryCache
			});
		} else {
			// Removing the old cached inventory
			cachedInventory = [];
			ET.IUser.GetInventory((err, body) => {
				if (err) {
					return;
				} else {
					if (body.status == 1) {
						// Inventory loaded successfully
						var inventory = [];
						body.response.items.forEach(function(item) {
							inventory.push({
								id: item.id,
								category: item.category,
								name: item.name,
								img: item.image['600px'],
								color: item.color,
								price: item.suggested_price
							});
						});
						socket.emit('ownInventory', {
							content: inventory
						});
						// Caching the newly loaded inventory
						cachedInventory.push({
							inv: inventory,
							time: Date.now(),
							cache: true
						});
					} else {
						// Inventory could not load
						socket.emit('error', {
							content: 'INVENTORY_COULD_NOT_LOAD'
						});
					}
				}
			});
		}
	});
	
	
	socket.on('sendTrade', function(items) {
		ET.ITrade.SendOfferToSteamId({steam_id: user.id64, items: items.toString(), message: 'Knuthy'}, (err, body) => {
			if (err) {
				return;
			} else {
				if (body.status == 1) {
					// Trade sent successfully
					socket.emit('tradeSent', {
						id: body.response.offer.id,
						items: items
					});
				} else {
					// Trade could not be sent
					socket.emit('error', {
						content: 'INVENTORY_COULD_NOT_LOAD'
					});
				}
			}
		});
	});
});

// Function for removing old cache
function clearInventory(steamId) {
	for (let i = cachedInventories.length - 1; i >= 0; i--) {
		if (cachedInventories[i]['steamId'] == steamId) {
			cachedInventories.splice(i, 1);
		}
	}
	return cachedInventories;
}

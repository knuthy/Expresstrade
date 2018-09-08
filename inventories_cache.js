// This example is for user inventories. The same can be done with bot accounts. 
// Modifing the clearInventory function will make it possible to do it all in one.

var cachedInventories = [];

socket.on('loadUserInventory', function(forceRefresh) {
	var cache;
	var inventoryCache;
	
	// Is the user's inventory already cached?
	cachedInventories.forEach(function(inventory) {
		if (inv.steamId == socketuser.id64) {
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
		clearInventory(socketuser.id64);
		ET.ITrade.GetUserInventoryFromSteamId({steam_id: socketuser.id64}, (err, body) => {
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
						steamId: socketuser.id64,
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
// Function for removing old cache
function clearInventory(steamId) {
	for (let i = cachedInventories.length - 1; i >= 0; i--) {
		if (cachedInventories[i]['steamId'] == steamId) {
			cachedInventories.splice(i, 1);
		}
	}
	return cachedInventories;
}

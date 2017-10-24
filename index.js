'use strict';
const debug = require('debug')('plugin:router');
var cm = require('volos-cache-memory');
const url = require('url');
var request = require('request');

module.exports.init = function (config, logger, stats) {
	
	var cachename = 'router'+Math.floor(Math.random() * 100) + 1; //to ensure there is a unique cache per worker
	var lookupEndpoint = config['lookupEndpoint'];
	var lookupCache = config['lookupCache'] || 60000; //default is 1 min
	var disable = config['lookupDisabled'] || false;
	var cache = cm.create(cachename, { ttl: lookupCache });
	
	cache.setEncoding('utf8');
	
	return {
		onrequest: function(req, res, next) {
			debug ('plugin onrequest');
			var proxyName = res.proxy.name;
			var proxyRev = res.proxy.revision;
			var key = proxyName + '_' + proxyRev;
			var target = res.proxy.url;
			var queryparams = url.parse(req.url).search || '';
			
			debug ('key: ' + key + ' and target ' + target);
			
			if (disable) {
				debug('plugin diabled');
				next();
			} else {
				cache.get(key, function(err, value) {
				    if (value) {
				    	debug("found endpoint " + value);
						//change endpoint
						var parts = url.parse(value);
						req.targetHostname = parts.host;
						req.targetPort = parts.port;
						req.targetPath = parts.pathname + queryparams;
						next();
				    } else {
						debug("key not found in cache");
						request(lookupEndpoint+"?proxyName="+proxyName+"&proxyRev="+proxyRev, function(error, response, body){
							if (!err) {
								var endpoint = JSON.parse(body);
								if (endpoint.endpoint) {
									debug("found endpoint " + endpoint.endpoint);
									cache.set(key, endpoint.endpoint);
									var parts = url.parse(endpoint.endpoint);
									req.targetHostname = parts.host;
									req.targetPort = parts.port;
									req.targetPath = parts.pathname + queryparams;									
								}
								else {
									debug("endpoint not found, using proxy endpoint");
									cache.set(key, target);
								}
							} else {
								debug(err);
								debug("endpoint not found, using proxy endpoint");
								cache.set(key, target);
							}
							next();
						});			    	
				    }
				});
				
			}			
		}
	}	
}
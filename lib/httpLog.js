"use strict";
/* -------------------------------------------------------------------
 * Require Statements << Keep in alphabetical order >>
 * ---------------------------------------------------------------- */

var arguer = require('arguer');
var Util = require('util');

/* =============================================================================
 * 
 * HttpLog
 *  
 * ========================================================================== */

module.exports = HttpLog;

var _constructorFormat = 
[
	{ name: 'status', type: 'number', optional: true },
	{ name: 'error', instance: Error, optional: true },
	{ name: 'message', type: 'string', mutex: 'error' },
	{ name: 'data', optional: true }
];

Util.inherits(HttpLog, Error);
var httpLog = HttpLog; // this is just to make JSHint stop complaining about casing
function HttpLog ()
{
	var args = arguer(arguments, _constructorFormat);
	if (args instanceof Error)
		return httpLog(args);

	if (args.error instanceof HttpLog)
		return args.error;
	
	var log;
	
	if (args.error)
	{
		log = args.error;
	}
	else if (args.message !== undefined || (args.status !== 200 && args.status !== undefined && args.data !== null) || args.data)
	{
		log = new Error(args.message);
	}
	else
	{
		return HttpLog.none;
	}
	
	log.__proto__ = HttpLog.prototype;
	if (args.status !== undefined)
		log.status = args.status;
	
	log.data = args.data || {};
	
	return log;
}

/* -------------------------------------------------------------------
 * Private Members Declaration << no methods >>
 * ---------------------------------------------------------------- */

HttpLog.prototype.__previous = null;
 
/* -------------------------------------------------------------------
 * Public Members Declaration << no methods >>
 * ---------------------------------------------------------------- */

Object.defineProperty(HttpLog.prototype, 'previous',
{
	get: function () { return this.__previous; },
	set: function (val)
	{
		if (val === httpLog.none)
			return;
		
		if (val === null)
		{
			this.__previous = null;
			return;
		}
		
		if (!(val instanceof HttpLog))
			val = httpLog(val);
		
		var log = this;
		while (log.__previous)
			log = log.__previous;
		
		log.__previous = val;
	}
});

Object.defineProperty(HttpLog.prototype, 'failed',
{
	get: function ()
	{
		return this.highestLevel >= 400;
	}
});

Object.defineProperty(HttpLog.prototype, 'highestLevel',
{
	get: function ()
	{
		var highestLevel = 0;
		var log = this;
		do
		{
			highestLevel = Math.max(log.status, highestLevel);
		}
		while (log = log.previous);
		
		return highestLevel; 
	}
});

HttpLog.none = httpLog(200, { __none: true });
Object.freeze(HttpLog.none.data);
Object.freeze(HttpLog.none);
 
/* -------------------------------------------------------------------
 * Static Methods << Keep in alphabetical order >>
 * ---------------------------------------------------------------- */

HttpLog.configure = function (config)
{
	for (var i in config)
	{
		switch (i)
		{
			case 'status':
			case 'display':
				HttpLog.prototype[i] = config[i];
				break;
		}
	}
};

HttpLog.ok = httpLog.bind(null, 200);
HttpLog.created = httpLog.bind(null, 201);
HttpLog.accepted = httpLog.bind(null, 202);
HttpLog.noContent = httpLog.bind(null, 204);

HttpLog.badRequest = httpLog.bind(null, 400);
HttpLog.unauthorized = httpLog.bind(null, 401);
HttpLog.forbidden = httpLog.bind(null, 403);
HttpLog.notFound = httpLog.bind(null, 404);
HttpLog.methodNotAllowed = httpLog.bind(null, 405);
HttpLog.notAcceptable = httpLog.bind(null, 406);
HttpLog.requestTimeout = httpLog.bind(null, 408);
HttpLog.conflict = httpLog.bind(null, 409);
HttpLog.gone = httpLog.bind(null, 410);

HttpLog.internalServerError = httpLog.bind(null, 500);
HttpLog.notImplemented = httpLog.bind(null, 501);
HttpLog.serviceUnavailable = httpLog.bind(null, 503);

/* -------------------------------------------------------------------
 * Public Methods << Keep in alphabetical order >>
 * ---------------------------------------------------------------- */

HttpLog.prototype.propagate = function (callback)
{
	var orig = this;
	return function ()
	{
		if (arguments.length == 0)
		{
			callback(orig);
			return;
		}
		
		var args = Array.prototype.slice.call(arguments);
		var log = httpLog(args[0]);
		
		if (log !== HttpLog.none)
			log.previous = orig;
		else
			log = orig;
		
		args[0] = log;
		callback.apply(null, args);
	};
};

/* -------------------------------------------------------------------
 * Private Methods << Keep in alphabetical order >>
 * ---------------------------------------------------------------- */

// code

/* -------------------------------------------------------------------
 * Initialization
 * ---------------------------------------------------------------- */

HttpLog.configure({ status: 500, display: 'An internal error occurred.' });

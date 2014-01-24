"use strict";
/* -------------------------------------------------------------------
 * Require Statements << Keep in alphabetical order >>
 * ---------------------------------------------------------------- */

var arguer = require('arguer').thrower;
var httpLog = require('./httpLog.js');
var Util = require('util');

/* =============================================================================
 * 
 * Athena (Async Control Framework)
 *  
 * ========================================================================== */

var async = module.exports;

/* -------------------------------------------------------------------
 * Public Methods << Keep in alphabetical order >>
 * ---------------------------------------------------------------- */

var _mapFormat =
[
	{ name: 'hlog', instance: httpLog, optional: true },
	{ name: 'arr', type: 'object' },
	{ name: 'method', type: 'function' },
	{ name: 'resultsHandler', type: 'function' }
];
async.map = function (/* hlog, */ arr, method, resultsHandler)
{
	var args = arguer(arguments, _mapFormat);

	var hlog = args.hlog || null;

	var waiting = {};
	var finished = false;
	var results = args.arr instanceof Array ? new Array(args.arr.length) : {};
	var context = new AsyncContext(hlog);
	
	for (var i in args.arr)
	{
		waiting[i] = true;
		args.method.call(context, callback.bind(null, i), args.arr[i], i);
	}

	finished = true;
	checkDone(); // in case all methods actually ran synchronously.
	
	function callback (key, err, result)
	{
		delete waiting[key];
		results[key] = result;
		context.log(err);
		checkDone();
	}

	function checkDone ()
	{
		if (finished && Object.keys(waiting).length === 0 && typeof args.resultsHandler === 'function')
		{
			args.resultsHandler.call(context, context.__hlog, results);
			args.resultsHandler = null; // prevent from being called multiple times
		}
	}
};

var _parallelFormat =
[
	{ name: 'hlog', instance: httpLog, optional: true },
	{ name: 'methods', type: 'object' },
	{ name: 'resultsHandler', type: 'function' }
];
async.parallel = function (/* hlog, */ methods, resultsHandler)
{
	var args = arguer(arguments, _parallelFormat);

	var hlog = args.hlog || null;
	
	var waiting = {};
	var finished = false;
	var results = args.methods instanceof Array ? new Array(args.methods.length) : {};
	var context = new AsyncContext(hlog);
	
	for (var i in args.methods)
	{
		if (typeof args.methods[i] !== 'function')
			continue;

		waiting[i] = true;
		args.methods[i].call(context, callback.bind(null, i));
	}
	
	finished = true;
	checkDone(); // in case all methods actually ran synchronously.
	
	function callback (key, err, result)
	{
		delete waiting[key];
		results[key] = result;
		context.log(err);
		checkDone();
	}
	
	function checkDone()
	{
		if (finished && Object.keys(waiting).length === 0 && typeof args.resultsHandler === 'function')
		{
			args.resultsHandler.call(context, context.__hlog, results);
			args.resultsHandler = null; // prevent from being called multiple times
		}
	}
};

var _waterfallFormat =
	[
		{ name: 'hlog', instance: httpLog, optional: true },
		{ name: 'methods', instance: Array },
		{ name: 'errorHandler', type: 'function' }
	];
async.waterfall = function (/* hlog, */ methods, errorHandler)
{
	var args = arguer(arguments, _waterfallFormat);

	var hlog = args.hlog || null;

	var iterator = { fn: null, called: false, allowReinvoke: false };
	for (var i = methods.length - 1; i > -1; i--)
	{
		iterator = { fn: methods[i], next: iterator, called: false, allowReinvoke: false };
	}

	var context = new WaterfallContext(hlog);
	process.nextTick(WaterfallRun.bind(context, iterator, errorHandler));
};

/* -------------------------------------------------------------------
 * AsyncContext (Base Context Class)
 * ---------------------------------------------------------------- */

function AsyncContext (hlog)
{
	this.__hlog = httpLog(hlog);
}

AsyncContext.prototype.log = function (hlog)
{
	this.__hlog = httpLog.chain(this.__hlog, hlog);
};

/* -------------------------------------------------------------------
 * WaterfallContext
 * ---------------------------------------------------------------- */

Util.inherits(WaterfallContext, AsyncContext);

function WaterfallContext (hlog)
{
	AsyncContext.call(this, hlog);
}

function WaterfallRun (iterator, errorHandler)
{
	var context = this;
	
	function createCallback (iterator)
	{
		var _break = false;
		var cb = function ()
		{
			var args = Array.prototype.slice.call(arguments);
			
			process.nextTick(function ()
			{
				if (args.length > 0)
				{
					context.log(args[0]);
				}
				else
				{
					args = [ null ]
				}

				if (iterator.called && (iterator.next &&!iterator.next.allowReinvoke))
					return;

				iterator.called = true;

				if (!iterator.fn || _break || context.__hlog.failed)
				{
					args[0] = context.__hlog || httpLog.none;
					errorHandler.apply(context, args);
				}
				else
				{
					iterator.next.allowReinvoke = false;
					args[0] = createCallback(iterator.next);
					iterator.fn.apply(context, args);
				}
			});
		};
		
		cb.break = function (hlog)
		{
			_break = true;
			cb(hlog);
		};
		
		cb.enableReinvoke = function ()
		{
			iterator.allowReinvoke = true;
		};
		
		cb.preventReinvoke = function ()
		{
			iterator.allowReinvoke = false;
		};
		
		return cb;
	}
	
	createCallback(iterator)();
}

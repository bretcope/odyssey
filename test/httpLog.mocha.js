"use strict";
var assert = require('assert');
var odyssey = require('../');

var httpLog = odyssey.httpLog;

suite('HttpLog', function ()
{
	test('HttpLog.none is correct', function ()
	{
		assert(!httpLog.none.failed, '.failed was true');
		assert(httpLog.none.status === 200, 'Status was not 200');
		
		try
		{
			httpLog.none.test = 'a';
			httpLog.none.data.test = 'a';
		}
		catch (ex)
		{
			return;
		}
		
		assert(false, 'HttpLog.none is extensible. It should be frozen.');
	});
	
	test('Empty constructor creates HttpLog.none', function ()
	{
		var hlog = httpLog();
		assert(hlog === httpLog.none);
	});
	
	test('Null constructor creates Http.none', function ()
	{
		var hlog = httpLog(null);
		assert(hlog === httpLog.none);
	});
	
	test('Returned objects are instances of HttpLog and Error', function ()
	{
		assert(httpLog() instanceof httpLog);
		assert(httpLog() instanceof Error);
		assert(httpLog(400) instanceof httpLog);
		assert(httpLog(400) instanceof Error);
	});
	
	test('Error without status defaults to 500', function ()
	{
		var err = new Error('this is an error');
		var hlog = httpLog(err);
		assert(hlog.status === 500);
	});
	
	test('Error with a status is preserved', function ()
	{
		var err = new Error('this is an error');
		err.status = 400;
		var hlog = httpLog(err);
		assert(hlog.status === 400);
	});
	
	test('Error with a status is overridden when desired', function ()
	{
		var err = new Error('this is an error');
		err.status = 400;
		var hlog = httpLog(404, err);
		assert(hlog.status === 404);
	});

	test('Can construct with http.IncomingMessage (with statusCode)', function ()
	{
		var http = require('http');
		var response = new http.IncomingMessage();
		response.statusCode = 404;

		var hlog = httpLog(response);
		assert(hlog.status === 404, 'Invalid status');
		assert(hlog.message === http.STATUS_CODES['404'], 'Invalid message');
	});
	
	test('Null is not turned into an error when default status is provided', function ()
	{
		var hlog = httpLog(404, null);
		assert(hlog === httpLog.none);
	});
	
	test('Simply passing a status code creates new log', function ()
	{
		var hlog = httpLog(404);
		assert(hlog.status === 404);
	});
	
	test('Constructor with various signatures', function ()
	{
		var status = 403;
		var msg = 'this is a message';
		var data = { nothing: 'here' };
		
		var hlog;
		
		hlog = httpLog(msg);
		assert(hlog.status === 500, 'Incorrect status');
		assert(hlog.message === msg, 'Message does not match');
		
		hlog = httpLog(status, msg);
		assert(hlog.status === status, 'Incorrect status');
		assert(hlog.message === msg, 'Message does not match');
		
		hlog = httpLog(msg, data);
		assert(hlog.message === msg, 'Message does not match');
		assert(hlog.data === data, 'Data does not match');
		
		hlog = httpLog(status, data);
		assert(hlog.status === status, 'Incorrect status');
		assert(hlog.data === data, 'Data does not match');
		
		hlog = httpLog(status, msg, data);
		assert(hlog.status === status, 'Incorrect status');
		assert(hlog.message === msg, 'Message does not match');
		assert(hlog.data === data, 'Data does not match');
	});
	
	test('Chaining preserves log history', function ()
	{
		var prev = httpLog.none;
		for (var i = 400; i < 404; i++)
		{
			prev = httpLog.chain(prev, httpLog(i));
		}

		var next = httpLog.none;
		for (i = 200; i < 204; i++)
		{
			next = httpLog.chain(next, httpLog(i));
		}
		
		var hlog;
		
		//verify initial chains
		hlog = prev;
		for (i = 403; i > 399; i--)
		{
			assert(hlog.status === i);
			hlog = hlog.previous;
		}
		assert(hlog === null);
		
		hlog = next;
		for (i = 203; i > 199; i--)
		{
			assert(hlog.status === i);
			hlog = hlog.previous;
		}
		assert(hlog === null);
		
		//combine the chains
		hlog = httpLog.chain(prev, next);
		
		assert(hlog === next);
		assert(hlog.status === 203);
		assert(hlog.highestLevel === 403);
		
		//verify new order
		hlog = hlog.previous;
		assert(hlog.status === 202);
		hlog = hlog.previous;
		assert(hlog.status === 201);
		hlog = hlog.previous;
		assert(hlog.status === 200);
		hlog = hlog.previous;
		assert(hlog.status === 403);
		hlog = hlog.previous;
		assert(hlog.status === 402);
		hlog = hlog.previous;
		assert(hlog.status === 401);
		hlog = hlog.previous;
		assert(hlog.status === 400);
		hlog = hlog.previous;
		assert(hlog === null);
	});
});

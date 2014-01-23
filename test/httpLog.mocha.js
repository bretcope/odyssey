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
});
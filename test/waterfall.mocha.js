"use strict";

var assert = require('assert');
var odyssey = require('../');

var async = odyssey.async;
var httpLog = odyssey.httpLog;

suite('Waterfall', function ()
{
	test('Should call each function in order', function (done)
	{
		var output = '';
		async.waterfall
		(
			[
				function (cb)
				{
					output += 'a';
					process.nextTick(cb);
				},
				function (cb)
				{
					output += 'b';
					process.nextTick(cb);
				},
				function (cb)
				{
					output += 'c';
					process.nextTick(cb);
				},
				function (cb)
				{
					output += 'd';
					process.nextTick(cb);
				}
			],
			function ()
			{
				assert(output === 'abcd', 'Should have been called once in order.');
				done();
			}
		);
	});
	
	test('Non-failure log should not break waterfall', function (done)
	{
		var output = '';
		async.waterfall
		(
			[
				function (cb)
				{
					output += 'a';
					process.nextTick(cb);
				},
				function (cb)
				{
					output += 'b';
					var hlog = httpLog.created('This is not a failure');
					process.nextTick(cb.bind(null, hlog));
				},
				function (cb)
				{
					output += 'c';
					process.nextTick(cb);
				},
				function (cb)
				{
					output += 'd';
					process.nextTick(cb);
				}
			],
			function (hlog)
			{
				assert(output === 'abcd', 'All functions should have been called.');
				assert(hlog.status === 201, 'Log status should be 201.');
				done();
			}
		);
	});
	
	test('Failure log should break waterfall', function (done)
	{
		var output = '';
		async.waterfall
		(
			[
				function (cb)
				{
					output += 'a';
					process.nextTick(cb);
				},
				function (cb)
				{
					output += 'b';
					var hlog = httpLog.notImplemented('This is a failure');
					process.nextTick(cb.bind(null, hlog));
				},
				function (cb)
				{
					output += 'c';
					process.nextTick(cb);
				},
				function (cb)
				{
					output += 'd';
					process.nextTick(cb);
				}
			],
			function (hlog)
			{
				assert(output === 'ab', 'Should have broken after second function.');
				assert(hlog.status === 501, 'Log status should be 501.');
				done();
			}
		);
	});
	
	test('Arguments waterfall', function (done)
	{
		async.waterfall
		(
			[
				function (cb)
				{
					process.nextTick(cb.bind(null, null, 'a'));
				},
				function (cb, a)
				{
					process.nextTick(cb.bind(null, null, a, 'b'));
				},
				function (cb, a, b)
				{
					process.nextTick(cb.bind(null, null, a, b, 'c'));
				},
				function (cb, a, b, c)
				{
					process.nextTick(cb.bind(null, null, a, b, c, 'd'));
				}
			],
			function (hlog)
			{
				assert(arguments.length === 5, 'Error handler should have received 5 arguments.');
				
				var output = Array.prototype.slice.call(arguments, 1).join('');
				assert(output === 'abcd', 'Arguments were not passed correctly through the waterfall.');
				
				assert(hlog === httpLog.none, 'hlog should have been httpLog.none');
				
				done();
			}
		);
	});
	
	test('Synchronous invoking of callbacks', function (done)
	{
		async.waterfall
		(
			[
				function (cb)
				{
					cb(null, 'a');
				},
				function (cb, a)
				{
					cb(null, a, 'b');
				},
				function (cb, a, b)
				{
					cb(null, a, b, 'c');
				},
				function (cb, a, b, c)
				{
					cb(null, a, b, c, 'd');
				}
			],
			function (hlog)
			{
				assert(arguments.length === 5, 'Error handler should have received 5 arguments.');
				
				var output = Array.prototype.slice.call(arguments, 1).join('');
				assert(output === 'abcd', 'Arguments were not passed correctly through the waterfall.');
				done();
			}
		);
	});
	
	test('Push logs inside waterfall function', function (done)
	{
		var output = '';
		async.waterfall
		(
			[
				function (cb)
				{
					output += 'a';
					process.nextTick(cb);
				},
				function (cb)
				{
					output += 'b';
					this.log(httpLog.ok('This is not a failure'));
					process.nextTick(cb);
				},
				function (cb)
				{
					output += 'c';
					this.log(httpLog.notImplemented('This is a failure'));
					cb();
				},
				function (cb)
				{
					output += 'd';
					process.nextTick(cb);
				}
			],
			function (hlog)
			{
				assert(output === 'abc', 'Should have broken after the third function.');
				assert(hlog.status === 501, 'Log status should be 501.');
				assert(hlog.previous.status === 200, 'Previous Log status should be 200.');
				done();
			}
		);
	});
	
	test('Arbitrary break point', function (done)
	{
		var output = '';
		async.waterfall
		(
			[
				function (cb)
				{
					output += 'a';
					process.nextTick(cb);
				},
				function (cb)
				{
					output += 'b';
					process.nextTick(cb);
				},
				function (cb)
				{
					output += 'c';
					cb.break();
				},
				function (cb)
				{
					output += 'd';
					process.nextTick(cb);
				}
			],
			function (hlog)
			{
				assert(output === 'abc', 'Should have broken after the third function.');
				assert(hlog === httpLog.none, 'hlog should have been httpLog.none');
				done();
			}
		);
	});
});
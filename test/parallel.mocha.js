"use strict";

var assert = require('assert');
var odyssey = require('../');

var async = odyssey.async;
var httpLog = odyssey.httpLog;

suite('Parallel', function ()
{
	test('Basic Example', function (done)
	{
		async.parallel
		(
			{
				one: function (cb)
				{
					process.nextTick(cb.bind(null, null, 'ONE'));
				},
				two: function (cb)
				{
					setTimeout(cb.bind(null, null, 'TWO'), 30);
				},
				three: function (cb)
				{
					process.nextTick(cb.bind(null, null, 'THREE'));
				}
			},
			function (hlog, results)
			{
				assert(!hlog.failed);
				assert(results.one === 'ONE');
				assert(results.two === 'TWO');
				assert(results.three === 'THREE');
				
				done();
			}
		);
	});
});
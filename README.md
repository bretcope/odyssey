# Odyssey

Odyssey is an asynchronous logging system for node.js in development.

    npm install odyssey

1. [Why another node.js logging system?](#why-another)
2. [HttpLog](#httplog)
    * [Including](#httplog-including)
    * [Constructor](#httplog-constructor)
    * [Properties](#httplog-properties)
    * [HttpLog.none](#httplog-none)
    * [Chaining Logs](#httplog-chaining)
3. [Athena (Async Control Flows)](#athena)
    * [Including](#athena-including)
    * [Context](#athena-context)
    * [Control Flows](#athena-controlflows)

<a name="why-another"></a>
## Why another node.js logging system?

Odyssey's purpose is to make it easier to produce logs which are associated with an HTTP request/response. Due to Node.js's async nature, it can be difficult to trace log entries back to the request which initiated the problem, and therefore makes debugging more tedious and difficult.

In a typical node.js callback, the first parameter is for an error to be passed, and the typical test used to determine whether the function failed is `if (err) { ... }`. This works okay if you only have two log levels ("nothing to log" and "completely failed"). However, if you want a more expressive log chain, this is insufficient.

The Odyssey paradigm believes that every callback should return an `Error` object, but that not all Error object should be treated equally. So, instead of `if (err) ...`, we should be checking `if (err.failed) ...`. Many logging systems have a sense of "log level" such as DEBUG, INFO, WARN, ERROR, CRITICAL. Odyssey has, instead, chosen to use the existing HTTP Status Codes as its "levels." This actually results in fairly expressive and useful logs, and is explained more in the __HttpLog__ section.

<a name="httplog"></a>
## HttpLog

HttpLogs use [HTTP Status Codes](http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html) instead of arbitrarily named error levels. This tends to have two benefits: 1. it is generally easier to decide which category a log falls into because each status code has a standardized description, and 2. it makes it easier for a request handler to make a decision about which error code to use if the error already has a usable status code.

One downside to this approach is that it does not make a distinction between what someone might consider a DEBUG vs INFO level log. The obvious choice for INFO logs is status `200` since that's the HTTP code for "OK". For DEBUG you may develop your own rules, or use a non-existent code, such as `99`. A better approach, however, may be to simply use `console.log()` for debug purposes.

It is advisable to put some thought into the error codes you use. For example, if you are writing a function which fetches a document from a database, if that document does not exist, you may want to use a `404` (not found). If you cannot connect to the database, you may want to use a `500` or `503` instead.

<a name="httplog-including"></a>
### Including

```javascript
var httpLog = require('odyssey').httpLog;
```

<a name="httplog-constructor"></a>
### Constructor

The HttpLog constructor accepts several signatures. It should __not__ be called with `new` keyword. Even though it is called like a function, the returned objects are instances of HttpLog. Additionally, HttpLog inherits from the default `Error` constructor. Therefore:

```javascript
console.log(httpLog() instanceof httpLog); // outputs "true"
console.log(httpLog() instanceof Error);   // outputs "true"
```

<a name="httplog-constructor-signatures"></a>
##### Signatures

```
httpLog ( )
httpLog ( [code], err, [data] )
httpLog ( [code], [message], [data] )
```

* `code` The number to assigned to [status](#httplog-properties-status).
* `err` Error object to be converted to an HttpLog.
* `message` A string which will be assigned to [message](#httplog-properties-message).

<a name="httplog-constructor-converting"></a>
##### Converting an Existing Error to HttpLog

```javascript
var err = new Error('this is an error');
var hlog = httpLog(err);
```

If the Error object passed to the constructor already has a status property, it is preserved. If it does not have a status, `hlog.status` is set to `500`.

If you would like to force the HttpLog to use a specific status code, this can be passed as a first parameter:

```javascript
var err = new Error('forbidden');
var hlog = httpLog(403, err);
```

If, instead of an Error object, `err` is null, then the constructor will return [HttpLog.none](#httplog-none). 

<a name="httplog-constructor-new"></a>
##### Creating New HttpLogs

New HttpLogs can be created by calling the constructor directly:

```javascript
/* ALL of the following instantiations are valid */

httpLog();       // returns httpLog.none
httpLog(400);
httpLog('This is a message');
httpLog({ my: 'data' });
httpLog(400, 'This is a message');
httpLog(400, { my: 'data' });
httpLog(400, 'This is a message', { my: 'data' });
```

<a name="httplog-constructor-shortcuts"></a>
##### Constructor Shortcuts

Additionally, there are shortcut methods which are more human-readable, automatically populate the status code. For example:

```javascript
var hlog = new httpLog.badRequest('this was a bad request');
console.log(hlog.status); // 400
```

All of these methods use the signature `httpLog.methodName( [message], [data] )` for new logs, and `httpLog.methodName( [err], [data] )` for converting existing Error objects.

Every standard [HTTP Status Code](http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html) has a shortcut method:

```javascript
continue                     // 100
switchingProtocols           // 101

ok                           // 200
created                      // 201
accepted                     // 202
nonAuthoritativeInformation  // 203
noContent                    // 204
resetContent                 // 205
partialContent               // 206

multipleChoices              // 300
movedPermanently             // 301
found                        // 302
seeOther                     // 303
notModified                  // 304
useProxy                     // 305
temporaryRedirect            // 307

badRequest                   // 400
unauthorized                 // 401
paymentRequired              // 402
forbidden                    // 403
notFound                     // 404
methodNotAllowed             // 405
notAcceptable                // 406
proxyAuthenticationRequired  // 407
requestTimeout               // 408
conflict                     // 409
gone                         // 410
lengthRequired               // 411
preconditionFailed           // 412
requestEntityTooLarge        // 413
requestURITooLong            // 414
unsupportedMediaType         // 415
requestedRangeNotSatisfiable // 416
expectationFailed            // 417

internalServerError          // 500
notImplemented               // 501
serviceUnavailable           // 503
gatewayTimeout               // 504
httpVersionNotSupported      // 505
```

<a name="httplog-properties"></a>
### Properties

<a name="httplog-properties-data"></a>
##### data

`HttpLog.data` is a standardized container for arbitrary information which you may want to store as part of the log. It defaults to an empty object.

```javascript
var hlog = httpLog({ my: 'data' });
console.log(hlog.data); // outputs { my: 'data' }
```

<a name="httplog-properties-failed"></a>
##### failed

`HttpLog.failed` is actually a getter which returns true if any log in the [log chain](#httplog-chaining) has a [status](#ttplog-properties-status) of 400 or greater.

```javascript
httpLog(200).failed // false
httpLog(400).failed // true
```

<a name="httplog-properties-highestlevel"></a>
##### highestLevel

`HttpLog.highestLevel` is a getter which returns the maximum [status](#ttplog-properties-status) value of any log in the [log chain](#httplog-chaining).

<a name="httplog-properties-message"></a>
##### message

A string message. Inherited from [Error.message](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/message).

<a name="httplog-properties-previous"></a>
##### previous

`HttpLog.previous` is a getter and setter which represents the previous log in the [log chain](#httplog-chaining). If there is no previous log, or if the previous log was [HttpLog.none](#httplog-none), the _getter_ value will be `null`.

If the value assigned to `previous` is not an HttpLog, the value will be passed to the HttpLog constructor in order to convert it.

<a name="httplog-properties-stack"></a>
##### stack

Inherited from [Error.stack](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Error/Stack).

<a name="httplog-properties-status"></a>
##### status

The status code. Should generally be a number representing an [HTTP Status Code](http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html).

<a name="httplog-none"></a>
### HttpLog.none

There is a special instance of HttpLog called "none" which is returned from the constructor function in some circumstances. It can be referenced directly via `httpLog.none`, which can be used as a source of comparison.

```javascript
var hlog = httpLog();
console.log(hlog === httpLog.none); // outputs "true"
```

HttpLog.none can also be used in callbacks. For example, where you might have previously used `callback(null, val);`, consider using `callback(httpLog.none, val)`.

HttpLog.none is a [frozen](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) object, and cannot be modified. Attempting to modify HttpLog.none will not succeed, and will _throw_ an error in [strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions_and_function_scope/Strict_mode).

<a name="httplog-chaining"></a>
### Chaining Logs

A log chain is a linked list where every log has a [previous](#httplog-properties-previous) property which points to another log. This allows several log objects to be combined without the use of an array, and allows properties like [failed](#httplog-properties-failed) and [highestLevel](#httplog-properties-highestlevel) to seamlessly operate over the entire chain.

<a name="httplog-chain"></a>
##### HttpLog.chain

Although a log's [previous](#httplog-properties-previous) property can be set directly, the safer method is to use `HttpLog.chain(prev, next)`. On a basic level, this method assigns `next.previous = prev` and returns `next`; however, it handles several edge cases correctly. Namely:

1. It will never try to assign a log chain to `HttpLog.none`. If `next` is null or none, `chain()` will simply return `prev` instead.
2. It will preserve any existing log chains on both `prev` and `next`. If `next` has an existing chain, then `prev` is simply appended to the end of that chain.

__Example__

The chain which is produced by each statement is described by the end of line comments.

```javascript
var log1 = httpLog(200); // [200->null]
var log2 = httpLog.chain(log1, httpLog(201)); // [201->200->null]

// log2 is [log2->log1->null]

var log3 = httpLog.chain(httpLog(202), null); // [202->null] 
var log4 = httpLog.chain(log3, httpLog(203)); // [203->202->null]

// log4 is [log4->log3->null]

// now let's combine two logs with existing chains
var log5 = httpLog.chain(log2, log4); // [203->202->201->200->null]

// log5 is [log4->log2->log1->log3]
// also note that log5 === log4 (they point to the same object)
```

<a name="athena"></a>
## Athena (Async)

Athena is intended to provide similar utilities as [async](https://github.com/caolan/async). Because of Odyssey's unique design philosophy which says that the first argument to a callback should be an HttpLog, it is difficult to use existing async frameworks because they would see even `HttpLog.none` as a failure. Therefore, several async control flows have been included as part of Odyssey, and more will likely be added in the future.

Another notable difference between Athena and other async frameworks is that it always sends the callback argument as the ___first___ argument instead of last. The reason for this is described in the [waterfall](#athena-waterfall) control flow. 

<a name="athena-including"></a>
### Including

```javascript
var athena = require('odyssey').athena;
```

Or, if you wish, you may use the `async` alias.

```javascript
var async = require('odyssey').async;
```

The primary reason why the async module was given the name athena was simply to avoid confusion with the popular existing [async](https://github.com/caolan/async) library. If this possible confusion does not bother you, feel free to use either alias.

<a name="athena-context"></a>
### Context

The `this` object inside all functions within Athena control flows is a context object with one method and one property.

<a name="athena-context-logchain"></a>
__this.logChain__

This property represents the log chain associated with the control flow.

<a name="athena-context-log"></a>
__this.log()__

Calling `this.log( hlog )` is equivalent to `this.logChain = httpLog.chain(this.logChain, hlog);`. This allows you to easily add as many logs as you'd like to the control-flow's log chain.

<a name="athena-controlflows"></a>
### Control Flows

* [map](#athena-map)
* [parallel](#athena-parallel)
* [waterfall](#athena-waterfall)

<a name="athena-map"></a>
#### Map

Similar to [async.map](https://github.com/caolan/async#map).

```javascript
athena.map ( [hlog], items, iterator, resultsHandler );
```

* `hlog` an optional HttpLog which will be used as the initial [context.logChain](#athena-context-logchain) value.
* `items` an Array or Object representing the values to be iterated over.
* `iterator` a function with the signature `(callback, item, index)`. The `callback` takes two parameters: an HttpLog, and the "transformed" version of `item`.
* `resultsHandler` a function with the signature `(hlog, results)` where `hlog` is the log chain from all iterators, and `results` is either an array or object depending on what type `items` was.

The `iterator` will be called once for every item in `items`. When all iterators have completed (invoked the callback) the `resultsHandler` will be invoked. Although the iterators may complete in a different order than the original `items` array, the `results` is guaranteed to be in the original order.
 
> There is not currently a map implementation which waits for each iterator to complete before invoking the next, such as [mapSeries](https://github.com/caolan/async#mapSeries). This may be implemented in the future.

<a name="athena-parallel"></a>
#### Parallel

Parallel runs a set of tasks and calls a results-handler method when all tasks have completed. Similar to [async.parallel](https://github.com/caolan/async#parallel).

```javascript
athena.parallel ( [hlog], tasks, resultsHandler )
```

* `hlog` an optional HttpLog which will be used as the initial [context.logChain](#athena-context-logchain) value.
* `tasks` an Array or Object where the values are functions with the signature `(callback)`. The `callback` takes two parameters: an HttpLog, and a "result" of any type.
* `resultsHandler` a function with the signature `(hlog, results)` where `hlog` is the log chain from all tasks, and `results` is either an array or object depending on what type `tasks` was.

<a name="athena-waterfall"></a>
#### Waterfall

Waterfall passes the results of each task to the next task. Similar to [async.waterfall](https://github.com/caolan/async#waterfall).

```javascript
athena.waterfall ( [hlog], tasks, errorHandler )
```

* `hlog` an optional HttpLog which will be used as the initial [context.logChain](#athena-context-logchain) value.
* `tasks` an array of functions (described in better detail below).
* `errorHandler` the function which serves as both a final task and an error handler (described below).

__Tasks__

Each task function will receive a `callback` argument as the _first_ argument. The callback accepts any number of arguments, but the first argument will be interpreted as an HttpLog. This log becomes the root of [context.logChain](#athena-context-logchain). If the log's [failed](#httplog-properties-failed) property evaluates to true, then the `errorHandler` is called, and no further tasks are invoked. Otherwise, the next task is invoked, or if there are no more tasks, the errorHandler is invoked.

If a task calls its `callback` with more than one argument, then the next task will receive these extra arguments as additional parameters.

__Error Handler__

The `errorHandler` function is identical to a task function except that its first argument is an HttpLog instead of a callback. This log is the [context.logChain](#athena-context-logchain).

__Example__

```javascript

athena.waterfall(
  [
    function (callback) {
      callback(null, 1);
    },
    function (callback, a) {
      // a === 1
      callback(null, 2);
    },
    function (callback, a) {
      // a === 2
      callback(httpLog.none, a, 3);
    },
    function (callback, a, b) {
      // a === 2 && b === 3
      callback.(null, 1, a, b);
    }
  ],
  function (hlog, a, b, c) {
    // a === 1 && b === 2 && c === 3
    // hlog === httpLog.none
  }
);
```

For more examples, look in the [waterfall tests file](https://github.com/bretcope/odyssey/blob/master/test/waterfall.mocha.js).

__Breaking the waterfall without passing a failed log__

Sometimes it may be desirable to skip the remaining tasks and go straight to the `errorHandler`, but without having to actually throw an error. For this purpose, you may call `callback.break( [hlog] )`.

```javascript
athena.waterfall(
  [
    function (callback) {
      callback(null, true);
    },
    function (callback, shouldBreak) {
      if (shouldBreak) {
        callback.break(httpLog.none);
        return; // don't forget, you'll probably want to call return after calling break()
      }
      
      //some other logic
      callback();
    },
    function (callback) {
      // this never gets called
      callback();
    }
  ],
  function (hlog) {
  }
);
```

__Invoking a task multiple times__

Normally each task is invoked only once. Because accidentally invoking a task more than once could have unforeseen consequences, Athena prevents a this from happening by default. Only the first call to `callback()` will cause the next task to run.

However, there are a limited number of circumstances where you may want a task to run more than once. In those cases, `callback.enableReinvoke()` is provided. This should be called in the task which is intended to be run multiple times (not the previous task). After `enableReinvoke` has been called, the task _may_ be invoked __EXACTLY ONE__ additional time. The next time the task is invoked, it can either choose to call `enableReinvoke` again to enable a third invocation, or it can choose to not, which means it cannot be called again.

Example allowing infinite reinvocations:

```javascript
var count = 0;
athena.waterfall(
  [
    function (callback) {
      for (var i = 0; i < 6; i++)
      	callback();
    },
    function (callback) {
      // this task can run any number of times because it always calls enableReinvoke
      callback.enableReinvoke();
      
      count++
      if (count === 6)
        callback();
    }
  ],
  function (hlog) {
    console.log(count); // 6
  }
);
```

Example allowing only a limited number of reinvocations:

```javascript
var count = 0;
athena.waterfall(
  [
    function (callback) {
      for (var i = 0; i < 6; i++)
      	callback();
    },
    function (callback) {
      // this task can only run 4 times, even though the previous task attempts to invoke it 6 times
      count++;
      if (count < 4)
        callback.enableReinvoke();
      else
        callback();
    }
  ],
  function (hlog) {
    console.log(count); // 4
  }
);
```

__Why is the callback the first argument?__

_Shouldn't it be the last argument, which is the standard in JavaScript?_ The problem with making it the last argument is that the index of the last argument changes depending on the number of arguments the previous task passed to its callback. Sometimes there are situations where a previous task may pass a variable number of arguments which can be difficult and tedious to account for. If you don't handle every argument signature correctly, you may introduce bugs where the program will crash because you tried to call the argument which you thought was the callback, only to find that named-argument happened to be a string this time. Moving the callback to the first position puts it in a consistent location regardless of the number of arguments passed by the previous task.

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
4. [Why the name Odyssey?](#why-name)

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

A log chain is a linked list where every log has a [previous](#httplog-properties-previous) property which points to another log.

The most common reason for chaining logs is to create a more useful log while also preserving any original errors.

Consider this example:

```javascript
function requestHandler (req, res) {
  
}

function getUser (callback) {
  
}

function getFromDb (key, callback) {
  var callLog = httpLog.ok('db call', { key: key });
  db.get(key, function (err, val) {
    var hlog = httpLog(err);
    if (!hlog.failed) {
      hlog = httpLog.ok('db success');
    }
    hlog.previous = callLog;
    callback(httpLog, val);
  });
}
```

<a name="athena"></a>
## Athena (Async)

//

<a name="why-name"></a>
## Why the name Odyssey?

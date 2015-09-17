EventEmitter.js
===============

Javascript Event Emitter. The best you'll get ^^

This library supports:
* on: multiple events, event namespaces, multiple listeners, listeners with context
* off: all, multiple events, event namespaces, multiple listeners, listeners with context
* emit: multiple events, event namespaces
* listeners: multiple events, namespaces, all at once
* newListener/removeListener events
* chainable
* includes inherit method

#Install

Install with [Bower](http://bower.io): `bower install opusonline-eventemitter.js`

#Usage

###Example

```javascript
function Foo() {
	EventEmitter.call(this);
}
EventEmitter.inherits(Foo);

Foo.prototype.bar = function() {
	this.emit('bar');
};

var foo = new Foo();
foo.on('bar', function() {
	console.log('Yeah, it works!');
});
foo.bar();
```

Some Highlights:

```javascript
foo.on(['foo', 'bar'], listener1, [listener2, myContext]); // multiple events, multiple listener, listeners context

foo
	.on('newListener', function(event, ee) { // newListener event
		console.log(ee.listener);
	})
	.on('foo.bar', something); // chaining, namespaces

foo.emit(['foo', 'pow'], arg1, arg2); // emit multiple events at once

foo.off('.bar'); // namespaces
```

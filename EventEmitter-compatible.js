/*!
 * Event Emitter (the best you'll get ^^)
 * author: Stefan Benicke
 * version: 1.1.1
 * url: https://github.com/opusonline/EventEmitter.js
 * license: MIT
 * features:
 * - on: multiple events, event namespaces, multiple listeners, listeners with context
 * - off: all, multiple events, event namespaces, multiple listeners, listeners with context
 * - emit: multiple events, event namespaces
 * - listeners: multiple events, namespaces, all at once
 * - newListener/removeListener events
 * - chainable
 * - includes inherit method and noConflict
 * inspired by:
 * - https://nodejs.org/api/events.html
 * - http://radio.uxder.com/ (radiojs)
 * - https://github.com/Olical/EventEmitter
 * - https://github.com/asyncly/EventEmitter2
 * - https://github.com/primus/eventemitter3
 */
;
(function (global, undefined) {
    'use strict';

    var existingEventEmitter = global.EventEmitter;

    function EE(listener, namespaces, once) {
        if (isArray(listener)) {
            this.listener = listener[0];
            this.context = listener[1];
        } else {
            this.listener = listener;
            this.context = global;
        }
        this.namespaces = namespaces;
        this.once = once || false;
    }

    function EventEmitter() {
    }

    EventEmitter.noConflict = function noConflict() {
        global.EventEmitter = existingEventEmitter;
        return EventEmitter;
    };

    // adapted from https://github.com/nodejs/node-v0.x-archive/blob/master/lib/util.js#L634
    EventEmitter.inherits = function inherits(ctor) {
        ctor.super_ = EventEmitter;
        ctor.prototype = createObject(EventEmitter.prototype, {
            constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
    };

    EventEmitter.prototype._events = undefined;

    EventEmitter.prototype.listeners = function listeners(event) {
        var i, n, namespaces, result = [];
        if (arguments.length === 0 || typeof event === 'undefined') {
            for (event in this._events) {
                if (this._events.hasOwnProperty(event)) {
                    for (i = 0, n = this._events[event].length; i < n; i++) {
                        result.push(this._events[event][i]); // copy
                    }
                }
            }
            return result;
        } else if (arguments.length > 1) {
            for (i = 0, n = arguments.length; i < n; i++) {
                arrayExtend(result, this.listeners.call(this, arguments[i]));
            }
            return result;
        }
        if (stringIncludes(event, '.')) {
            namespaces = event.split('.');
            event = namespaces.splice(0, 1)[0];
        }
        if (event === '') {
            for (event in this._events) {
                if (this._events.hasOwnProperty(event)) {
                    for (i = 0, n = this._events[event].length; i < n; i++) {
                        if (allInArray(namespaces, this._events[event][i].namespaces)) {
                            result.push(this._events[event][i]); // copy
                        }
                    }
                }
            }
        } else {
            if (this._events.hasOwnProperty(event) === false) {
                return result;
            }
            for (i = 0, n = this._events[event].length; i < n; i++) {
                if (allInArray(namespaces, this._events[event][i].namespaces)) {
                    result.push(this._events[event][i]); // copy
                }
            }
        }
        return result;
    };

    EventEmitter.prototype.emit = function emit(event/*, ...args */) {
        var args, once, i, n, namespaces;
        if (typeof this._events === 'undefined' || arguments.length < 1 || typeof event === 'undefined') {
            return this;
        }
        if (isArray(event)) {
            for (i = 0, n = event.length; i < n; i++) {
                arguments[0] = event[i];
                this.emit.apply(this, arguments);
            }
            return this;
        }
        if (stringIncludes(event, '.')) {
            namespaces = event.split('.');
            event = namespaces.splice(0, 1)[0];
        }
        if (this._events.hasOwnProperty(event) === false) {
            return this;
        }
        if (arguments.length > 1) {
            args = Array.prototype.slice.call(arguments, 1);
        }
        for (i = 0, n = this._events[event].length; i < n; i++) {
            if (allInArray(namespaces, this._events[event][i].namespaces)) {
                this._events[event][i].listener.apply(this._events[event][i].context, args);
                if (this._events[event][i].once) {
                    once = true;
                }
            }
        }
        if (once) {
            removeEvent.call(this, event, namespaces, onceCheckFunction);
        }
        return this;
    };

    EventEmitter.prototype.on = function on(event/*, ...listener */) {
        var i, n;
        if (arguments.length < 2 || typeof event === 'undefined') {
            return this;
        }
        if (isArray(event)) {
            for (i = 0, n = event.length; i < n; i++) {
                arguments[0] = event[i];
                this.on.apply(this, arguments);
            }
            return this;
        }
        for (i = 1, n = arguments.length; i < n; i++) {
            storeListener.call(this, event, arguments[i]);
        }
        return this;
    };

    EventEmitter.prototype.once = function once(event/*, ...listener */) {
        var i, n;
        if (arguments.length < 2 || typeof event === 'undefined') {
            return this;
        }
        if (isArray(event)) {
            for (i = 0, n = event.length; i < n; i++) {
                arguments[0] = event[i];
                this.once.apply(this, arguments);
            }
            return this;
        }
        for (i = 1, n = arguments.length; i < n; i++) {
            storeListener.call(this, event, arguments[i], true);
        }
        return this;
    };

    function storeListener(event, listener, once) {
        var ee;
        var namespaces = event.split('.');
        event = namespaces.splice(0, 1)[0];
        ee = new EE(listener, namespaces, once);
        if (typeof this._events === 'undefined') {
            this._events = {};
        }
        if (this._events.hasOwnProperty(event) === false) {
            this._events[event] = [ee];
        } else {
            this._events[event].push(ee);
        }
        if (this._events.hasOwnProperty('newListener')) {
            this.emit('newListener', event, ee);
        }
    }

    EventEmitter.prototype.off = function off(event/*, ...listener */) {
        var i, n, namespaces;
        if (typeof this._events === 'undefined') {
            return this;
        }
        if (arguments.length === 0) {
            if (this._events.hasOwnProperty('removeListener')) {
                removeAndNotifyEvent.call(this);
            } else {
                this._events = undefined;
            }
        } else { // arguments.length > 0
            if (typeof event === 'undefined') {
                return this;
            }
            if (isArray(event)) {
                for (i = 0, n = event.length; i < n; i++) {
                    arguments[0] = event[i];
                    this.off.apply(this, arguments);
                }
                return this;
            }
            if (stringIncludes(event, '.')) {
                namespaces = event.split('.');
                event = namespaces.splice(0, 1)[0];
            }
            if (arguments.length === 1) {
                if (isArray(namespaces)) {
                    if (event === '') {
                        for (event in this._events) {
                            if (this._events.hasOwnProperty(event)) {
                                removeEvent.call(this, event, namespaces, argOneCheckFunction);
                            }
                        }
                    } else {
                        if (this._events.hasOwnProperty(event) === false) {
                            return this;
                        }
                        removeEvent.call(this, event, namespaces, argOneCheckFunction);
                    }
                } else {
                    if (this._events.hasOwnProperty(event) === false) {
                        return this;
                    }
                    if (this._events.hasOwnProperty('removeListener')) {
                        removeAndNotifyEvent.call(this, event);
                    } else {
                        delete this._events[event];
                    }
                }
            } else { // arguments.length > 1
                if (event === '') {
                    for (event in this._events) {
                        if (this._events.hasOwnProperty(event)) {
                            for (i = 1, n = arguments.length; i < n; i++) {
                                removeEvent.call(this, event, namespaces, argManyCheckFunction, arguments[i]);
                            }
                        }
                    }
                } else {
                    if (this._events.hasOwnProperty(event) === false) {
                        return this;
                    }
                    for (i = 1, n = arguments.length; i < n; i++) {
                        removeEvent.call(this, event, namespaces, argManyCheckFunction, arguments[i]);
                    }
                }
            }
        }
        return this;
    };

    function removeEvent(event, namespaces, checkFunction, listener) {
        var i, n, listeners;
        for (i = 0, n = this._events[event].length; i < n; i++) {
            if (checkFunction(this._events[event][i], namespaces, listener)) {
                if (this._events.hasOwnProperty('removeListener')) {
                    this.emit('removeListener', event, this._events[event][i]);
                }
                delete this._events[event][i];
            } else {
                if (!listeners) {
                    listeners = [];
                }
                listeners.push(this._events[event][i]);
            }
        }
        if (isArray(listeners) && listeners.length > 0) {
            this._events[event] = listeners;
        } else {
            delete this._events[event];
        }
    }

    function removeAndNotifyEvent(event) {
        var i, n;
        if (typeof event === 'undefined') {
            for (event in this._events) {
                if (this._events.hasOwnProperty(event)) {
                    removeAndNotifyEvent.call(this, event);
                }
            }
            return;
        }
        for (i = 0, n = this._events[event].length; i < n; i++) {
            this.emit('removeListener', event, this._events[event][i]);
            delete this._events[event][i];
        }
        delete this._events[event];
    }

    function argOneCheckFunction(ee, namespaces) {
        return allInArray(namespaces, ee.namespaces);
    }

    function argManyCheckFunction(ee, namespaces, listener) {
        return ((isArray(listener) && ee.listener === listener[0] && ee.context === listener[1]) || (ee.listener === listener)) && allInArray(namespaces, ee.namespaces);
    }

    function onceCheckFunction(ee, namespaces) {
        return ee.once === true && allInArray(namespaces, ee.namespaces);
    }

    EventEmitter.prototype.addListener = EventEmitter.prototype.on;
    EventEmitter.prototype.removeListener = EventEmitter.prototype.off;
    EventEmitter.prototype.removeAllListeners = EventEmitter.prototype.off;

    /* helper */

    function allInArray(source, target) {
        if (!isArray(source)) {
            return true; // important for emit, same as source.length === 0
        }
        if (source.length === 0) {
            return true;
        } else if (target.length === 0) {
            return false;
        }
        return arrayEvery(source, function (value) {
            return arrayIndexOf(target, value) > -1;
        });
    }

    // adapted from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
    function isArray(array) {
        if (Array.isArray) {
            return Array.isArray(array);
        }
        return Object.prototype.toString.call(array) === '[object Array]';
    }

    // adapted from https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
    function arrayIndexOf(array, searchElement, fromIndex) {
        var k, O, len, n;
        if (Array.prototype.indexOf) {
            return Array.prototype.indexOf.call(array, searchElement, fromIndex);
        }
        if (array == null) {
            throw new TypeError('array is null or not defined');
        }
        O = Object(array);
        len = O.length >>> 0;
        if (len === 0) {
            return -1;
        }
        n = +fromIndex || 0;
        if (Math.abs(n) === Infinity) {
            n = 0;
        }
        if (n >= len) {
            return -1;
        }
        k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
        while (k < len) {
            if (k in O && O[k] === searchElement) {
                return k;
            }
            k++;
        }
        return -1;
    }

    // adapted from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every
    function arrayEvery(array, callbackfn, thisArg) {
        var T, k, O, len, kValue, testResult;
        if (Array.prototype.every) {
            return Array.prototype.every.call(array, callbackfn, thisArg);
        }
        if (array == null) {
            throw new TypeError('array is null or not defined');
        }
        O = Object(array);
        len = O.length >>> 0;
        if (typeof callbackfn !== 'function') {
            throw new TypeError();
        }
        if (arguments.length > 2) {
            T = thisArg;
        }
        k = 0;
        while (k < len) {
            if (k in O) {
                kValue = O[k];
                testResult = callbackfn.call(T, kValue, k, O);
                if (!testResult) {
                    return false;
                }
            }
            k++;
        }
        return true;
    }

    // adapted from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes
    function stringIncludes(string, search, from) {
        if (String.prototype.includes) {
            return String.prototype.includes.call(string, search, from);
        }
        return String.prototype.indexOf.call(string, search, from) !== -1;
    }

    // adapted from  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
    var createObject = (function() {
        if (Object.create) {
            return Object.create;
        }
        function Temp() {
        }
        var hasOwn = Object.prototype.hasOwnProperty;
        return function (O) {
            if (typeof O != 'object') {
                throw TypeError('Object prototype may only be an Object or null');
            }
            Temp.prototype = O;
            var obj = new Temp();
            Temp.prototype = null;
            if (arguments.length > 1) {
                var Properties = Object(arguments[1]);
                for (var prop in Properties) {
                    if (hasOwn.call(Properties, prop)) {
                        obj[prop] = Properties[prop];
                    }
                }
            }
            return obj;
        };
    })();

    function arrayExtend(source, target) {
        var i, n;
        if (!isArray(source)) {
            return source;
        }
        if (isArray(target)) {
            for (i = 0, n = target.length; i < n; i++) {
                source.push(target[i]);
            }
        } else {
            source.push(target);
        }
        return source;
    }

    /* end helper */

    if (typeof define === 'function' && define.amd) {
        define(function () {
            return EventEmitter;
        });
    } else if (typeof module !== 'undefined') {
        module.exports = EventEmitter;
    } else {
        global.EventEmitter = EventEmitter;
    }

})(this);

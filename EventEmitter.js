/*!
 * Event Emitter (the best you'll get ^^)
 * author: Stefan Benicke
 * version: 1.2.0
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
 * support:
 * - ie9, safari 5, opera 10.5, chrome 5, ff 4, mobile, node
 */
;
(function (global, undefined) {
    'use strict';

    var nativeBind;
    var existingEventEmitter = global.EventEmitter;

    function EE(listener, namespaces, once) {
        var context;
        if (Array.isArray(listener)) {
            this.listener = listener[0];
            context = listener[1];
        } else {
            this.listener = listener;
        }
        if (this.listener.hasOwnProperty('boundThis')) {
            context = this.listener.boundThis; // bound functions are prefered against apply context
        }
        this.context = context;
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
        ctor.prototype = Object.create(EventEmitter.prototype, {
            constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
    };

    EventEmitter.prototype.listeners = function listeners(event) {
        var i, n, namespaces, result = [];
        if (typeof this._events === 'undefined') {
            return result;
        }
        if (arguments.length === 0 || typeof event === 'undefined') {
            for (event in this._events) {
                if (this._events.hasOwnProperty(event)) {
                    for (i = 0, n = this._events[event].length; i < n; i++) {
                        result.push(this._events[event][i]);
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
        if (event.indexOf('.') !== -1) {
            namespaces = event.split('.');
            event = namespaces.splice(0, 1)[0];
        }
        if (event === '') {
            for (event in this._events) {
                if (this._events.hasOwnProperty(event)) {
                    for (i = 0, n = this._events[event].length; i < n; i++) {
                        if (allInArray(namespaces, this._events[event][i].namespaces)) {
                            result.push(this._events[event][i]);
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
                    result.push(this._events[event][i]);
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
        if (Array.isArray(event)) {
            for (i = 0, n = event.length; i < n; i++) {
                arguments[0] = event[i];
                this.emit.apply(this, arguments);
            }
            return this;
        }
        if (event.indexOf('.') !== -1) {
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
        if (Array.isArray(event)) {
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
        if (Array.isArray(event)) {
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
                delete this._events;
            }
        } else { // arguments.length > 0
            if (typeof event === 'undefined') {
                return this;
            }
            if (Array.isArray(event)) {
                for (i = 0, n = event.length; i < n; i++) {
                    arguments[0] = event[i];
                    this.off.apply(this, arguments);
                }
                return this;
            }
            if (event.indexOf('.') !== -1) {
                namespaces = event.split('.');
                event = namespaces.splice(0, 1)[0];
            }
            if (arguments.length === 1) {
                if (Array.isArray(namespaces)) {
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
        if (Array.isArray(listeners) && listeners.length > 0) {
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
        return ((Array.isArray(listener) && ee.listener === listener[0] && ee.context === listener[1]) || (ee.listener === listener)) && allInArray(namespaces, ee.namespaces);
    }

    function onceCheckFunction(ee, namespaces) {
        return ee.once === true && allInArray(namespaces, ee.namespaces);
    }

    EventEmitter.prototype.addListener = EventEmitter.prototype.on;
    EventEmitter.prototype.removeListener = EventEmitter.prototype.off;
    EventEmitter.prototype.removeAllListeners = EventEmitter.prototype.off;

    /* helper */

    function allInArray(source, target) {
        if (!Array.isArray(source)) {
            return true; // important for emit, same as source.length === 0
        }
        if (source.length === 0) {
            return true;
        } else if (target.length === 0) {
            return false;
        }
        return source.every(function (value) {
            return target.indexOf(value) !== -1;
        });
    }

    function arrayExtend(source, target) {
        var i, n;
        if (!Array.isArray(source)) {
            return source;
        }
        if (Array.isArray(target)) {
            for (i = 0, n = target.length; i < n; i++) {
                source.push(target[i]);
            }
        } else {
            source.push(target);
        }
        return source;
    }

    // shim to reach bound context
    if (Function.prototype.bind) {
        nativeBind = Function.prototype.bind;
        Function.prototype.bind = function(oThis) {
            var fn = this;
            var args = Array.prototype.slice.call(arguments, 1);
            var boundFn = nativeBind.apply(fn, arguments);
            return Object.defineProperties(boundFn, {
                boundThis: {
                    value: oThis
                },
                boundArgs: {
                    value: args
                },
                targetFunction: {
                    value: fn
                }
            });
        };
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

'use strict';

const { Route } = require('@nodevel/framework').Facades;

/** Injected globally by the framework at boot (View helpers). */
declare function view(name: string, data?: Record<string, unknown>): any;

Route.get('/', function () {
    return view('welcome', { name: 'Nodevel' });
});

export {};

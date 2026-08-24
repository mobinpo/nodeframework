'use strict';

const { Route } = require('@nodevel/framework').Facades;

Route.get('/', function () {
    return view('welcome', { name: 'Nodevel' });
});

<div id="intro"></div>
# Intro

One big source of confusion when writing web apps powered by Node.js is the fact that both the front-end code (i.e. runs in the browser) and the back-end (i.e. runs on the server) are JavaScript. It gets even more confusing when both have controllers, models, views, and all their files exist in the same project.

Synth makes this easier by having any JavaScript, images, html, or other assets that are sent to the browser in the _front_ folder and code that runs on the server is in the _back_ folder.

<div id="frontend"></div>
# Front-end

All front-end code goes into your app's _front/_ folder. Inside the _front_ folder there are some key files and folders you should take note of:

- `index.jade` - The main html file that is rendered server side. Think of it as the bridge that joins the back-end and the front-end. It is rendered by the back-end and then sent to the browser whenever a page is requested. It tells the browser which JavaScript and CSS files should be requested. It specifies how preloaded data is exposed (more on that later) as well as the preloaded HTML view.
- `bower.json` - Tracks which third-party packages are needed from [bower](http://bower.io) for the app to work. You shouldn't need to edit this file directly since running `synth install -f <package_name>` will automatically add that package to the list of your app's front-end dependencies.
- `css/` - Place _.css_, _.scss_, _.sass_, and _.styl_ files here. They'll automatically get converted to CSS when served up to the browser.
- `js/` - Place _.js_, and _.coffee_ files here. CoffeeScript files will automatically get converted to JS when served up to the browser.
- `images/` - Place _.jpeg_, _.gif_, and _.png_ files here. They can then be referenced in HTML using _/images/&lt;filename.ext&gt;_.
- `html/` - Place _.html_, _.jade_, and _.ejs_ files here. This is where you place the HTML partials that power your app's various views.
- `misc/` - Any other static files that need to be made available to the browser go here. Files placed here are made available from the root path. For example, just place a [robots.txt](http://www.robotstxt.org/) file here and it'll be available at _/robots.txt_.
- `bower_components/` - Contains third-party packages installed by bower. The default _.gitignore_ file for synth projects filters this out since running _synth install -f_ rebuilds this folder.

<div id="backend"></div>
# Back-End

All back-end code goes into your app's _back/_ folder.

<div id="back-app-js"></div>
## back-app.js

This is the script that is run when starting up the server. It's for declaring any desired middleware, loading the main synth module, and adding custom Express request handlers to the Express app generated by Synth.

Here's an example:

```javascript
// Include modules
var synth = require("synth");

// Declare middleware using express app that writes to the log
var app = synth.app;
app.use(function (req, res, next) {
  console.log(new Date, req.method, req.path);
  next();
});

// Initialize the server and make it public by assigning to module.exports
module.exports = synth();

// Create an additional request handler
app.get("/admin", function (req, res) {
  res.render('../front/html/admin');
});
```

<div id="creating-api-endpoints"></div>
## Creating API Resources + Endpoints

_Synth_ scans the `resources` folder for .js (or .coffee) files. An API is generated based on the names of the folders that they're in.

**Note:** The names of the js/coffee files themselves are not parsed by _synth_, so name them how you see fit. One way is to name them using [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete), such as _create.js_, _update.js_, _read.js_, and _delete.js_.

For example, to create a _memoes_ resource, create a folder of that same name:

    | my_app
      | back
        | resources
          | memoes

You can then declare a request handler for a specific HTTP method in any file that is in the resources directory by assigning a function to `exports.<method><optional: ActionName>`.

Possible function names:

- `exports.get`: Creates a _get_ method that will expect a resources ID passed in via the URL. e.g. `/api/memoes/124`
- `exports.getIndex`: Special version of _get_ that won't expect a resource ID. e.g. `GET /api/memoes`. Use this for getting a list of resources.
- `exports.post`: Handles _post_ requests, does not expect a resource ID in the URL. e.g. `POST /api/memoes`. Use this for creating new resources.
- `exports.put`: Use this for making changes to the specified resource, expects an ID to be passed in via the URL. e.g. `PUT /api/memoes/124`
- `exports.delete`: Use this to delete the record specified by the ID passed in via the URL. e.g. `DELETE /api/memoes/124`
- `exports.getAnythingElse`: Create custom actions for a resource by using one of the four methods followed by a custom name. e.g. `exports.postPublish` responds to `POST /api/memoes/publish?id=124`.

**Note**: By default, custom actions won't expect an ID. If you need to pass that info, use a query parameter. e.g. `/api/memoes/publish?id=124`.

#### Promises

_Synth_ has been designed to expect promises to be returned by request handlers.

If one of your request handlers returns a promise, or an object that can be JSONified, _Synth_ will respond to the browser using the result of that promise.

By returning promises (instead of using Express' `res` object), it enables _Synth_ to preload data when opening subviews.

#### Specifying Services

Each API endpoint handler can specify services that it requires to fulfill its duty.

For example, every new _Synth_ project comes with a `params` service. This service parses the various sources of parameters that a request provides, such as the URL path, query parameters, and the JSON body.

If an API request handler specifies a `params` parameter, then that service will be resolved an passed in before invoking the handler.

#### API endpoint example

Here's an example _GET_ request handler for the memoes resource that lists all the created memoes:

```javascript
exports.get = function (db, params) {
  return db.collection('memoes').findOne({
    id: params.id
  })
  .then(function (data) {
    delete data.secret; // Remove the "secret" field from the object before sending it to the user
    return data;
  });
};
```

**Note:** If you need to declare a public function in a .js or .coffee file in your resources directory, but you don't want it to be parsed by _Synth_, just put an underscore in front. e.g. `exports._helper = function () { … }`

#### Throwing errors

If for some reason you cannot complete the API request, you can throw an error and Synth will output it using console.error(). If you're running your app in dev mode, the error will be sent to the client too. In production mode a generic message "an error has occurred" will be sent to the client.

You can throw errors a few ways:

- `Number`: If you just throw a number, the server will respond with that HTTP response status code, but no message will be recorded.
- `String`: With a string, the status code of the HTTP response will be 500, and specified string will be recorded to the console. In dev mode, it'll be sent to the client as well.
- `{statusCode: Number, message: String}`: If you want to specify both a status code and a message, throw an object with the keys `statusCode` and `message`.
- `new Error(message)`: If an Error object is thrown, the stack trace will be written to the console.

For example:

```javascript
exports.get = function (user, db, params) {
  if (!user.admin) {
    throw {
      statusCode: 403,
      message: "User is not an admin"
    };
  }

  return db.find(…).toArray();
};
```

<div id="services"></div>
## Services

Services are a new feature introduced in Synth version 0.6 to make it easier to load dependencies before handling an API request. One likely dependency you might want to load is the currently logged in user, for example.

### Creating a service

To create a service for your Synth project, create a .js or .coffee file in `/back/services/`. Any function you publicly export from a file within that folder will be added to your project's list of available services.

A service can return either a value or a promise. If a promise is returned, Synth will wait for it to be resolved.

For example, to create a service that provides a connection to the DB:

`/back/services/db.js`

```javascript
var connection = require('promised-mongo')('localhost');
// Creates a services called 'db'
exports.db = function () {
  return connection;
};
```

**Note:** If you need to declare a public function in a .js or .coffee file in your services directory, but you don't want it to be parsed by _Synth_, just put an underscore in front. e.g. `exports._helper = function () { … }`

#### Requesting a service

Any API request handler can request a dependency by specifying it as a parameter. Usually in JavaScript, the name of the parameter isn't significant, but Synth will actually read the names of the parameters for each API endpoint and try to look up a service of that name.

Services can depend on other services as well.

There are 3 built-in services that you can optionally use:

- req - The standard NodeJS/Express request object.
- res - The standard NodeJS/Express response object.
<!-- - config - The Synth configuration for the requested API endpoint. -->

For example:

`/back/services/user.js`

```javascript
// user depends on users and params
// first db is executed
// users is the run with the results of db injected as a parameter
// finally, user is executed with users and params injected in
exports.user = function (users, params) {
  // returns a promise to the requested user object
  return users.findOne({
    username: params.username,
    password: params.password
  });
};

exports.users = function (db) {
  return db.collection('users');
};

exports.params = function (req) {
  return _.merge(req.params, req.query);
};
```

**Note**: You can create an infinite loop (and crash your server) if you have one service depend on another that depends on the first service. This will result in a stack overflow, so watch out for that.

<div id="packages"></div>
# Third-party packages

Synth makes use of existing package managers to add third-party code to both your back-end and front-end. [NPM](https://npmjs.org/) is used for back-end packages, and [Bower](https://bower.io/) is used for front-end packages.

Synth provides a single unified interface to both, invoked from the root of your project.

<div id="installing-packages"></div>
## Installing packages

To install either a back-end or a front-end package, just use _synth_'s install command:

```bash
synth install -f jquery
```

You can specify that a package is meant for  the front or back-ends using the -b or -f flags:

```bash
synth install -f lodash  # Installs lodash for the front end (using bower)
synth install -b lodash  # Installs lodash for the back end (using npm)
```

<div id="supported-assets"></div>
## Supported assets

_Synth_ supports JavaScript/CoffeeScript, CSS/SASS/Stylus, and HTML/Jade/EJS. _Synth_ will also precompile, minify and concatenate your JS and CSS assets when set to run in production mode (with built-in support for [ng-annotate](https://github.com/olov/ng-annotate) to keep your angular dependencies automatically working after minification).

<div id="front-end-manifest"></div>
## Front-end _Manifest_ files

Your project should contain manifest files for your front-end assets, one for CSS and the other JavaScript. You can find the CSS manifest in `front/css/cssFiles`, and the JavaScript one in `front/js/jsFiles`. Each contains the list of css/js files (separated by new-lines) that should be loaded by the client.

Each asset file is loaded in the order that they're listed in the given manifest. This is important if any asset depends on another. For example, make sure that the jquery library is listed before any jQuery plugins that depend on it.

Most front-end packages contain many extra files that shouldn't be served up to web browsers. _Synth_ reads the _bower.json_ that comes with most packages to look for the package's _main_ file. It will then place a reference to that file in the Manifest.

If there are extra files that need to be loaded from a package, or a bower package didn't list its main file, just add a reference to the front-end _Manifest_ file. For example, a reference to jquery's main file would look like `../bower_components/jquery/jquery.js`

When you serve up your app in dev mode, each front-end asset is loaded serparately, and unminified, to help with debugging. This also means that as you change the asset file, you don't need to recompile or restart the server.

When you serve up your app in production mode, all the assets are minified and concattenated into two files (one for css, one for javascript). This helps reduce server load and improve client-side performance. It sucks for development though since you need to restart the server if you make any changes.

## More about third-party packages

Back-end packages are installed in `back/node_modules` and front-end packages are installed in `front/bower_components`.

_Synth_ records which packages are installed in two files: `back/packages.json` (for back-end packages) and `front/bower.json` (for front-end packages). To make sure that you have installed all the packages specified in a _synth_ app, just run `synth install -b` and `synth install -f` from the app's root folder.

<div id="synth-json"></div>
# synth.json

All of the web apps settings and meta-info are stored in _synth.json_. This includes the web app's name, version, and homepage.

For `version`, it is recommended that you use the [semver](http://semver.org/) format.

<div id="deploying"></div>
# Deploying

Synth's directory structure is a bit different from most Node web apps, especially in the 3 following ways:

- With Synth, the `node_modules` directory is under `back` and not at the project's root.
- Same goes for `package.json`.
- Synth apps are started using `synth server` on the command line.

<div id="heroku"></div>
## Heroku

To make it super easy to deploy Synth apps on Heroku (and compatible platforms), use the [Heroku Buildpack for Synth](https://github.com/JonAbrams/heroku-buildpack-synth).

```
# Create a new Heroku app that uses this buildpack
heroku create --buildpack https://github.com/JonAbrams/heroku-buildpack-synth -a <your_apps_name>

# Configure an existing Heroku app to use this buildpack
heroku config:set BUILDPACK_URL=https://github.com/JonAbrams/heroku-buildpack-synth
```
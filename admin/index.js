var async = require('async');
var express = require('express');
var hbs = require('express-handlebars');
var bodyParser = require('body-parser');
var r = require('rethinkdb');

var config = require('./config.js');

var app = express();
console.log(__dirname);
app.use('/js', express.static('js'));

app.set('views', __dirname + '/views');
app.engine('hbs', hbs({
  defaultLayout: 'main',
  extname: '.hbs',
  layoutsDir: __dirname + '/views'
}));
app.set('view engine', 'hbs');


app.route('/')
    .get(orders)

app.route('/stream')
    .get(stream);



//If we reach this middleware the route could not be handled and must be unknown.
app.use(handle404);

//Generic error handling middleware.
app.use(handleError);

/*
 * Page-not-found middleware.
 */
function handle404(req, res, next) {
  res.status(404).end('not found');
}
/*
 * Generic error handling middleware.
 * Send back a 500 page and log the error to the console.
 */
function handleError(err, req, res, next) {
  console.error(err.stack);
  res.status(500).json({err: err.message});
}

function startExpress(connection) {
  app._rdbConn = connection;
  app.listen(config.express.port);
  console.log('Listening on port ' + config.express.port);
}


function orders(req, res, next) {
  r.table('orders').orderBy({index: r.asc('createdAt')}).run(req.app._rdbConn, function (err, cursor) {
    if (err) {
      return next(err);
    }

    //Retrieve all the orders in an array.
    cursor.toArray(function (err, result) {
      if (err) {
        return next(err);
      }
      res.render('home', {title: 'Orders', orders: result});
    });
  });
}

function stream(req, res, next) {
  res.header('Content-Type', 'text/event-stream');
  res.header('Cache-Control', 'no-cache');
  res.header('Connection', 'keep-alive');
  res.status(200);

  r.table('orders').orderBy({index: r.asc('createdAt')}).changes().run(req.app._rdbConn, function(err, cursor) {

    cursor.each(function(error, result){

      if(!error){
        res.write("data: " + resultAsSJsontring(result) + "\n\n");
        //https://github.com/Yaffle/EventSource/issues/24
        //setInterval(function() {
        //  res.write(":keepalive " + Date.now() + "\n\n");
        //}, 30000);
      }else{
        console.log('error found.');
      }

    });
  });
}

function resultAsSJsontring(result){
  var order = {};
  if(result.new_val && !result.old_val){
    order = result.new_val;
    order.action = 'create';
  }
  else if(result.old_val && !result.new_val){
    order = result.old_val;
    order.status = 'delete'
  }
  else{
    order = result.new_val;
    order.status = 'update';
  }

  return JSON.stringify(order).replace(/(\r\n|\n|\r)/gm,"");
}

async.waterfall([
  function connect(callback) {
    r.connect(config.rethinkdb, callback);
  },
  function createDatabase(connection, callback) {
    //Create the database if needed.
    r.dbList().contains(config.rethinkdb.db).do(function (containsDb) {
      return r.branch(
          containsDb,
          {created: 0},
          r.dbCreate(config.rethinkdb.db)
      );
    }).run(connection, function (err) {
      callback(err, connection);
    });
  },
  function createTable(connection, callback) {
    //Create the table if needed.
    r.tableList().contains('orders').do(function (containsTable) {
      return r.branch(
          containsTable,
          {created: 0},
          r.tableCreate('orders')
      );
    }).run(connection, function (err) {
      callback(err, connection);
    });
  },
  function createIndex(connection, callback) {
    //Create the index if needed.
    r.table('orders').indexList().contains('createdAt').do(function (hasIndex) {
      return r.branch(
          hasIndex,
          {created: 0},
          r.table('orders').indexCreate('createdAt')
      );
    }).run(connection, function (err) {
      callback(err, connection);
    });
  },
  function waitForIndex(connection, callback) {
    //Wait for the index to be ready.
    r.table('orders').indexWait('createdAt').run(connection, function (err, result) {
      callback(err, connection);
    });
  }
], function (err, connection) {
  if (err) {
    console.error(err);
    process.exit(1);
    return;
  }

  startExpress(connection);
});

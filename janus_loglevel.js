// Change log level of server
// nodejs janus_loglevel.js 7 --level you want to set 
const WebSocket = require('ws');

const ws = new WebSocket("ws://IP:7188/admin", "janus-admin-protocol");
const args = process.argv;
if(args[2] === undefined){
  console.log("Argument not provided, loglevel 1-7")
  process.exit(1)
}


ws.on('open', function open() {
  //console.log("CONNECTED");
  doSend({"janus": "set_log_level", "transaction": "1", "admin_secret": "topsecret", "level": parseInt(args[2])});
});

ws.on('error', function close(e) {
  console.log(e);
});

ws.on('message', function incoming(data) {
  json = JSON.parse(data);
  console.log('Response: '+json.janus+', loglevel: '+json.level);
  ws.close();
});

function doSend(message) {
  var message = JSON.stringify(message);
  //console.log('SENT: ' + message);
  ws.send(message);
}


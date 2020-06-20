const WebSocket = require('ws');

const ws = new WebSocket("ws://IP:7188/admin", "janus-admin-protocol");

ws.on('open', function open() {
  //console.log("CONNECTED");
  doSend({"janus": "get_status", "transaction": "1", "admin_secret": "topsecret"});
});

ws.on('error', function close(e) {
  console.log(e);
});

ws.on('message', function incoming(data) {
  json = JSON.parse(data);
  console.log(json);
  ws.close();
});

function doSend(message) {
  var message = JSON.stringify(message);
  //console.log('SENT: ' + message);
  ws.send(message);
}


const WebSocket = require('ws');
const util = require('util')

const ws = new WebSocket("ws://IP:7188/admin", "janus-admin-protocol");

ws.on('open', function open() {
  //console.log("CONNECTED");
  doSend({"janus": "message_plugin", 
	"transaction": "1", 
	"admin_secret": "topsecret",
	"plugin": "janus.plugin.audiobridge",
	"request": {
		"request": "play_file",
		"room": ROOM_ID,
		"file_id": "1",
		"filename":"~/Thats-All-Folks.opus"
		}
	});
});

ws.on('error', function close(e) {
  //console.log(e);
});

ws.on('message', function incoming(data) {
  json = JSON.parse(data);
  //console.log('JSON: '+ json);
  console.log(util.inspect(json, false, null, true))
});

function doSend(message) {
  var message = JSON.stringify(message);
  //console.log('SENT: ' + message);
  ws.send(message);
}


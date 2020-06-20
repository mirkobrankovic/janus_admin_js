const WebSocket = require('ws');

const ws = new WebSocket("ws://IP:7188/admin", "janus-admin-protocol");

var count = 0;
var last_session;
ws.on('open', function open() {
  //console.log("CONNECTED");
  doSend({"janus": "list_sessions", "transaction": "1", "admin_secret": "topsecret"});
});

ws.on('error', function close(e) {
  //console.log(e);
});

ws.on('message', function incoming(data) {
  json = JSON.parse(data);
  if(!json.session_id) {
    //console.log('Sessions: '+ json.sessions);
    last_session = json.sessions[json.sessions.length-1];
    //console.log(last_session);
    for (var i = 0; i < json.sessions.length; i++) {
      doSend({"janus": "list_handles", 
		"transaction": "2", 
		"admin_secret": "topsecret", 
		"session_id": json.sessions[i]
	});
    }
  } else {
    //console.log('Handles: '+json.handles);
    count += json.handles.length;
  }

  if(json.session_id == last_session) {
    console.log(count)
    ws.close();
  }
});

function doSend(message) {
  var message = JSON.stringify(message);
  //console.log('SENT: ' + message);
  ws.send(message);
}


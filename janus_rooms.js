const WebSocket = require('ws')

const args = process.argv
if(args[2] === undefined){
  console.log("Argument not provided, audiobridge or videoroom")
  process.exit(1)
}

const ws = new WebSocket("ws://IP:7188/admin", "janus-admin-protocol")

ws.on('open', function open() { 
  //console.log("CONNECTED")
  list_request = { "janus": "message_plugin", "admin_secret": "topsecret", "transaction": "1", "request": { "request": "list" } }
  list_request.plugin = "janus.plugin.".concat(args[2])
  doSend(list_request)
})

ws.on('error', function close(e) {
  console.log(e)
})

ws.on('message', function incoming(data) {
  json = JSON.parse(data)
  //console.log(json)
  if(json.response["videoroom"] == "destroyed" || json.response["audiobridge"] == "destroyed"){
    list = ""
    console.log("Room: "+json.response["room"]+" destroyed")
  } else {
    list = json.response.list
  }
  if (!list && list.length === 0) {
    //console.log("No rooms")
  } else {
    for(i=0; i<list.length; i++){
      room = list[i].room
      members = list[i].num_participants
      if(members == 0) {
        console.log("Room: "+room+" has "+members+" members, destroy")
        destroy_request = { "janus": "message_plugin", "admin_secret": "topsecret", "transaction": "1", "request": { "request": "destroy", "room": room } }
        destroy_request.plugin = "janus.plugin.".concat(args[2])
        doSend(destroy_request)
      } else {
        console.log("Room: "+room+" has "+members+" members, not empty")
      }
    }
  }
  ws.close()
})

function doSend(message) {
  var message = JSON.stringify(message)
  //console.log('SENT: ' + message)
  ws.send(message)
}


var websocket;
var wsUri = "wss://IP:8989";
var output;
var session_id = null;
var handle_id;
var room = 1234;
var display;
var timeout;
var publisher = 0;
const senderStatsDiv = document.querySelector('div#senderStats');
const receiverStatsDiv = document.querySelector('div#receiverStats');

const localVideo = document.querySelector('div#localVideo video');
const remoteVideo = document.querySelector('div#remoteVideo video');
const localVideoStatsDiv = document.querySelector('div#localVideo div');
const remoteVideoStatsDiv = document.querySelector('div#remoteVideo div');

var configuration = 
{
  iceTransportPolicy: 'all',
  iceServers: [
    {
      urls: [
        'stun.l.google.com:19302'
      ]
    }
  ]
}
var pc = new RTCPeerConnection(configuration);
var pc1 = new RTCPeerConnection(configuration);

var request;
var publisher = 0;
var feed = {};
var feeds = [];

//////////////////////////////////////////////////
//WEBRTC stuff
pc.onaddstream = e => localVideo.srcObject = e.stream;
pc1.onaddstream = e => remoteVideo.srcObject = e.stream;

function gotOffer(json) {
  if (typeof json.sdp !== "undefined") {
      pc1.setRemoteDescription(new RTCSessionDescription(json));
  }
  else {
      pc1.addIceCandidate(new RTCIceCandidate(json.candidate));
  }
}

function gotAnswer(json) {
  if (typeof json.sdp !== "undefined") {
      pc.setRemoteDescription(new RTCSessionDescription(json));
  }
  else {
      pc.addIceCandidate(new RTCIceCandidate(json.candidate));
  }
}


function startAnswer(json) {
  navigator.getUserMedia({audio: true, video: true, data: true}, function(stream) {
    pc1.addStream(stream);

    pc1.createAnswer(function(answer) {
      pc1.setLocalDescription(answer, function() {
          request.session_id = json.session_id;
          request.handle_id = json.sender;
          request.jsep = answer;
          doSend(request);
      }, error);
    }, error);
  }, function(error){
          console.log("The following error occurred: " + error.name)
  });
  pc1.onicecandidate = function(event) {
    if (event.candidate == null ||  event.candidate.candidate.indexOf('endOfCandidates') > 0) {
      writeToScreen("LOG: End of candidates.");
      sendTrickleCandidate(request.handle_id, {"completed": true});
    } 
    else {
        var candidate = {
          "candidate": event.candidate.candidate,
          "sdpMid": event.candidate.sdpMid,
          "sdpMLineIndex": event.candidate.sdpMLineIndex
        };
        sendTrickleCandidate(request.handle_id, candidate);
    }
  };

  function endCall() {
    var videos = document.getElementsByTagName("video");
    for (var i = 0; i < videos.length; i++) {
      videos[i].pause();
    }
    pc.close();
  }

  function error(err) {
    endCall();
  }
}
///////////////////////////////////////////////////////////////////////////

function startOffer(json, request) {
    navigator.getUserMedia({
      audio: true,
      video: true,
    },
    function(stream) {
      //pc.onaddstream = a => video2.src = URL.createObjectURL(a.stream);
      pc.addStream(stream);

      pc.createOffer(function(offer) {
        pc.setLocalDescription(offer, function() {
          request.session_id = json.session_id;
          request.handle_id = json.sender;
          request.jsep = offer;
          doSend(request);
        }, error);
      }, error);
    }, function(error){
          console.log("The following error occurred: " + error.name)
      });

  pc.onaddstream = function(event) {
    var vid = document.createElement("video-share");
    document.appendChild(vid);
    vid.srcObject = event.stream;
  }
  pc.onicecandidate = function(event) {
      if (event.candidate == null ||  event.candidate.candidate.indexOf('endOfCandidates') > 0) {
        writeToScreen("LOG: End of candidates.");
        sendTrickleCandidate(request.handle_id, {"completed": true});
      } else {
          var candidate = {
            "candidate": event.candidate.candidate,
            "sdpMid": event.candidate.sdpMid,
            "sdpMLineIndex": event.candidate.sdpMLineIndex
          };
          sendTrickleCandidate(request.handle_id, candidate);
      }
  };

  function endCall() {
    var videos = document.getElementsByTagName("video");
    for (var i = 0; i < videos.length; i++) {
      videos[i].pause();
    }
    pc.close();
  }

  function error(err) {
    endCall();
  }
}
//////////////////////////////////////////////////////////////////////////////////////////////

function randomString(len) {
  var charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var randomString = '';
  for (var i = 0; i < len; i++) {
    var randomPoz = Math.floor(Math.random() * charSet.length);
    randomString += charSet.substring(randomPoz,randomPoz+1);
  }
  return randomString;
}

function keepAlive() {
  if(session_id !== null) {
      doSend({"janus":"keepalive","session_id":session_id,"transaction":randomString(12)});
  } else {
      writeToScreen("LOG: No session_id yet");
  }
  timeout = setTimeout(keepAlive, 30000);
}

function dumpStats(results) {
  let statsString = '';
  results.forEach(res => {
    if (["media-source", "candidate-pair", "inbound-rtp", "outbound-rtp", "remote-inbound-rtp"].includes(res.type)) {
      statsString += '<h3>Report type=';
      statsString += res.type;
      statsString += '</h3>\n';
      statsString += 'id ' + res.id + '<br>\n';
      statsString += 'time ' + res.timestamp + '<br>\n';
      Object.keys(res).forEach(k => {
        if (k !== 'timestamp' && k !== 'type' && k !== 'id') {
          statsString += k + ': ' + res[k] + '<br>\n';
        }
      });
    }
  });
  return statsString;
}

// Display statistics
setInterval(() => {
  if (pc || pc1) {
    // Display new-style getstats to the left
    pc.getStats(null)
      .then(results => {
        const statsString = dumpStats(results);
        senderStatsDiv.innerHTML = '<h2>New stats</h2>' + statsString;
      }, err => {
        console.log(err);
      });
  } else {
    console.log('Not connected yet');
  }
  // Collect some stats from the video tags.
  if (video.videoWidth) {
    localVideoStatsDiv.innerHTML = '<strong>Video dimensions:</strong> ' +
      video.videoWidth + 'x' + video.videoHeight + 'px';
  }
  if (remoteVideo.videoWidth) {
    remoteVideoStatsDiv.innerHTML = '<strong>Video dimensions:</strong> ' +
      remoteVideo.videoWidth + 'x' + remoteVideo.videoHeight + 'px';
  }
}, 5000);

function init() {
  output = document.getElementById("output");
  testWebSocket();
}

function testWebSocket() {
  websocket = new WebSocket(wsUri, "janus-protocol");
  websocket.onopen = function(evt) { onOpen(evt) };
  websocket.onclose = function(evt) { onClose(evt) };
  websocket.onmessage = function(evt) { onMessage(evt) };
  websocket.onerror = function(evt) { onError(evt) };
}

function onOpen(evt) {
  writeToScreen("CONNECTED");
  doSend({"janus":"create","transaction":randomString(12)});
  timeout = setInterval(keepAlive(session_id), 30000);
}

function sendTrickleCandidate(handle_id, candidate) {
  doSend({"janus": "trickle", "candidate": candidate, "transaction": randomString(16),"session_id":session_id, "handle_id":handle_id });
}


function attachToPlugin(session_id) {
  doSend({"janus":"attach","plugin":"janus.plugin.videoroom","transaction":randomString(12),"session_id":session_id});
}

function createRoom(session_id, handle_id, room) {
  doSend({"janus":"message","body":{"request":"create","description":"test", "room":room, "bitrate":512000,"publishers":5,"secret":"topsecret", "fir_freq":10, "audiocodec":"opus,pcma,pcmu", "videocodec":"vp8", "record":false},"transaction":randomString(12),"session_id":session_id,"handle_id":handle_id});

}

function joinRoom(session_id, handle_id, room) {
  publisher = 1;
  doSend({"janus":"message","body":{"request":"join","room":room,"codec":"pcma","ptype":"publisher","display":randomString(6)},"transaction":randomString(12),"session_id":session_id,"handle_id":handle_id});
}

function attachListeners(handle_id, feeds) {
  if(feed.attached == false) {
    doSend({ "janus": "message", "body": { "request": "join","room":room,"codec":"pcma","ptype":"subscriber","feed":feed.id},"transaction":feed.display,"session_id":session_id,"handle_id":handle_id});
      //feed.attached = true;
      //feeds.remove(i);
  }
  //console.log(feeds);
}

function onClose(evt) {
  console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
  setTimeout(function() {
    testWebSocket();
  }, 1000);
};

//function onClose(evt) {
//  writeToScreen("DISCONNECTED");
//  websocket.close();
//}

function onMessage(evt) {
  writeToScreen('RESPONSE: ' + evt.data);
  handleEvent(JSON.parse(evt.data));
}

function onError(evt) {
  writeToScreen('ERROR: ' + evt.data);
  websocket.close();
}

function doSend(message) {
  var message = JSON.stringify(message);
  writeToScreen('SENT: ' + message);
  websocket.send(message);
}

function writeToScreen(message) {
  console.log(message);
  //var pre = document.createElement("p");
  //pre.style.wordWrap = "break-word";
  //pre.innerHTML = message;
  //output.appendChild(pre);
}

function handleEvent(json) {
  if(json.janus === "timeout") {
    writeToScreen("LOG: Timeout on session_id: " + json.session_id);
    return;
  }
  if(json.janus === "keepalive") {
    return;
  }
  if(json.janus === "ack") {
      return;
  }
  if(json.janus === "success") {
    if(typeof json.session_id === 'undefined') {
      session_id = json.data.id
      writeToScreen("LOG: Got session_id: " + json.data.id);
      attachToPlugin(json.data.id);
    } else {
      if(typeof handle_id === 'undefined') {
        handle_id = json.data.id;
        writeToScreen("LOG: Got handle_id: " + handle_id + " on session: " + session_id + ", let's create the room!");
        createRoom(session_id, handle_id, room);
      } else {
        if(publisher == 1) { 
          writeToScreen("LOG: Got new handle_id: "+ json.data.id +" use it for subscriber.");
          //for (i = 0; i < feeds.length; i++) {
          attachListeners(json.data.id, feeds);

        } else {
          if(json.plugindata.data.videoroom === 'created') {
            writeToScreen("LOG: Room: "+json.plugindata.data.room+" created, now join it! ");
            joinRoom(session_id, handle_id, room);
          }
          if(json.plugindata.data.error_code == 427) {
            writeToScreen("LOG: Room: "+ room +" already created, join it!");
            joinRoom(session_id, handle_id, room);
          }
        }
      }
    }
  }
  if(json.janus === "event") {
    if(json.plugindata.data.videoroom === 'joined') {
      writeToScreen("LOG: Joined room: "+json.plugindata.data.room+" with room id: "+json.plugindata.data.id+"... send offer now");
      request = {"janus":"message","body":{"request":"configure","audio":true,"video":true,"data": true},"transaction":randomString(12)};
      startOffer(json, request);
      if(json.plugindata.data.publishers.length !== 0) {
        for (i = 0; i < json.plugindata.data.publishers.length; i++) { 
          writeToScreen("LOG: User already in room with nick:id == "+json.plugindata.data.publishers[i].display+":"+json.plugindata.data.publishers[i].id);
          feed.id = json.plugindata.data.publishers[i].id;
          feed.display = json.plugindata.data.publishers[i].display;
          feed.attached = false;
          feeds.push(feed);
          console.log(feeds);
          attachToPlugin(session_id);
        }
      }
    }
    if(json.plugindata.data.videoroom === 'event') {
      if(json.plugindata.data.configured === "ok") {
        if(json.jsep.type === "answer") {
          writeToScreen("LOG: Got answer!");
          gotAnswer(json.jsep);
        }

      } else if(typeof json.plugindata.data.publishers !== "undefined") {
        writeToScreen("LOG: User joined with nick:id == "+json.plugindata.data.publishers[0].display+":"+json.plugindata.data.publishers[0].id)+"attach as subscriber";
        feed.id = json.plugindata.data.publishers[0].id;
        feed.display = json.plugindata.data.publishers[0].display;
        feed.attached = false;
        feeds.push(feed);
        console.log(feeds);
        attachToPlugin(session_id); 
      } else if(typeof json.plugindata.data.unpublished !== "undefined") {
        writeToScreen("LOG: User unpublished: "+json.plugindata.data.unpublished);

      } else if(typeof json.plugindata.data.leaving !== "undefined") {
        writeToScreen("LOG: User left: "+json.plugindata.data.leaving);
      }
    } else if(json.plugindata.data.videoroom === 'attached') {
      writeToScreen("LOG: Got offer!");
      gotOffer(json.jsep);
      request = {"janus":"message","body":{"request":"start","room":room},"transaction":randomString(12)};
      startAnswer(json);
    }
  }
}
// end of handleEvent

window.addEventListener("load", init, false);

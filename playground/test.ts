var net = require("net");
var client = new net.Socket();
client.connect(
  80,
  "example.com",
  function() {
    console.log("Connected");
    client.write(`Hello!`);
  }
);

client.on("data", function(data) {
  console.log("Received " + data.length + " bytes\n" + data);
});

client.write(`GET / HTTP/1.0

`);

client.on("close", function() {
  console.log("Connection closed");
});


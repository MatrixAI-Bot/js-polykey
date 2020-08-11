import twilio, { Twilio } from 'twilio'

class NATBusting {
  private client: Twilio
  constructor() {
    // Your Account Sid and Auth Token from twilio.com/console
    // DANGER! This is insecure. See http://twil.io/secure
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.client = twilio(accountSid, authToken)
  }

  private async getToken() {
    return await this.client.tokens.create()
  }

  async createRTCPeerConnection() {
    const token = await this.getToken()
    console.log(token);
    console.log(token.iceServers);

    webkitRTCPeerConnection
    const iceServers: RTCIceServer[] = [{ "urls": [...token.iceServers] }]
    // const cert = new RTCCertificate()
    // console.log(cert.getFingerprints()[0].value);
    console.log(RTCPeerConnection);

    const configuration: RTCConfiguration = {
      iceServers
    }
    const pc = new RTCPeerConnection(configuration)
    const dataChannel = pc.createDataChannel('myLabel', {
    })

    //     dataChannel.onerror = (error) => {
    //       console.log("Data Channel Error:", error);
    //     };

    //     dataChannel.onmessage = (event) => {
    //       console.log("Got Data Channel Message:", event.data);
    //     };

    //     dataChannel.onopen = () => {
    //       dataChannel.send("Hello World!");
    //     };

    //     dataChannel.onclose = () => {
    //       console.log("The Data Channel is Closed");
    //     };

  }



}


async function main() {
  const nb = new NATBusting()
  nb.createRTCPeerConnection()
  // var socket = require('socket.io-client')('http://localhost');
  // socket.on('connect', function(){});
  // socket.on('event', function(data){});
  // socket.on('disconnect', function(){});

}

main()



import './App.css';
import Main from './components/Main'

import { useState, useEffect } from 'react';



const mediasoup = require('mediasoup-client')
const { v4: uuidV4 } = require('uuid');
const websocketUri = 'ws://0.tcp.ngrok.io:11107/ws'

let bntSub;
let bntCam;
let bntScreen;
let textPublish;
let textWebcam;
let textScreen;
let textSubscribe;
let localVideo;
let remoteVideo;
let remoteStream;
let device;
let producer;
let transport;
let userId;
let isWebcam;
let produceCallback, produceErrback;
let consumerCallback, consumerErrback;

let stream;
let socket;

let publish;
let subscribe;



function App() {

  const [webcamStream, setWebcamStream] = useState({})
  const [subscribedStream, setSubscribedStream] = useState({})
  useEffect(() => {
    connect();

  }, [])


  const connect = () => {

    socket = new WebSocket(websocketUri)
    console.log("socket - > ", socket)
    socket.onopen = () => {

      const msg = {
        type: "getRouterRtpCapabilities"
      }
      const resp = JSON.stringify(msg);

      socket.send(resp);

    }
    socket.onmessage = (event) => {


      const jsonValidation = IsJsonString(event.data);
      if (!jsonValidation) {
        console.error('json error')
        return
      }
      let resp = JSON.parse(event.data);

      switch (resp.type) {
        case 'routerCapabilities':
          onRouterCapabilities(resp);

          break;
        case 'producerTransportCreated':
          onProducerTransportCreated(resp);
          break;
        case 'subTransportCreated':
          onSubTransportCreated(resp)
          break;
        case 'resumed':
          console.log(event.data)
          break
        case 'subscribed':
          onSubscribed(resp)
          break
        default:
          break;
      }
    }

  }
  const onSubscribed = async (event) => {
    console.log(event)
    const {
      producerId,
      id,
      kind,
      rtpParameters,
    } = event.data;
    let codecOptions = {};
    const consumer = await transport.consume({
      id,
      producerId,
      kind,
      rtpParameters,
      codecOptions
    })
    const stream = new MediaStream();
    stream.addTrack(consumer.track);
    setSubscribedStream(stream)
  }
  const onSubTransportCreated = async (event) => {


    if (event.error) {
      console.error("on Sub transport created error", event.error)
      return
    }
    transport = device.createRecvTransport(event.data);
    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      const msg = {
        type: 'connectConsumerTransport',
        transportId: transport.id,
        dtlsParameters
      }
      const resp = JSON.stringify(msg);
      socket.send(resp);

      socket.addEventListener('message', (event) => {

        const jsonValidation = IsJsonString(event.data);
        if (!jsonValidation) {
          console.error('json error')
          return
        }
        let resp = JSON.parse(event.data);
        if (resp.type === "subConnected") {
          console.log("consumer transport connected")
          callback();
        }
      })
    });

    //connection state change begin
    transport.on('connectionstatechange', (state) => {

      switch (state) {
        case 'connecting':
          textPublish.innerHTML = "publishing .....";
          break;
        case 'connected':
          // liveStream = stream

          // setSubscribedStream(stream);
          // console.log("from connected", stream)
          const msg = {
            type: 'resume'
          }
          const resp = JSON.stringify(msg);
          socket.send(resp)
          textPublish.innerHTML = 'subscribed';
          break;
        case 'failed':
          transport.close();
          textPublish.innerHTML = 'failed';
          break;
        default:
          break;
      }
    });
    const stream = consumer(transport)
    //connection state change end



  }
  const consumer = async (transport) => {
    const { rtpCapabilities } = device;
    const msg = {
      type: 'consume',
      rtpCapabilities
    }

    const resp = JSON.stringify(msg);
    socket.send(resp)
  }

  const onProducerTransportCreated = async (event) => {


    if (event.error) {
      console.error("producer transport created error", event.error)
      return
    }
    const transport = device.createSendTransport(event.data);
    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      const msg = {
        type: 'connectProducerTransport',
        dtlsParameters
      }
      const resp = JSON.stringify(msg);
      socket.send(resp);

      socket.addEventListener('message', (event) => {

        const jsonValidation = IsJsonString(event.data);
        if (!jsonValidation) {
          console.error('json error')
          return
        }
        let resp = JSON.parse(event.data);
        if (resp.type === "producerConnected") {
          console.log("producer connected")
          callback();
        }
      })
    });
    //begin transport on producer
    transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
      console.log('rtp parameters => ', rtpParameters)
      const msg = {
        type: 'produce',
        transportId: transport.id,
        kind,
        rtpParameters
      };
      const resp = JSON.stringify(msg)
      socket.send(resp);
      socket.addEventListener('message', (resp) => {
        let parsedResponse = JSON.parse(resp.data)
        callback(parsedResponse.data.id)
      })
    });
    //end transport producer
    //connection state change begin
    transport.on('connectionstatechange', (state) => {
      console.log('state => ', state)
      switch (state) {
        case 'connecting':
          textPublish.innerHTML = "publishing .....";
          break;
        case 'connected':
          // liveStream = stream
          console.log("this is from localVideo before assignment = > ", localVideo)
          setWebcamStream(stream);
          console.log("this is from localVideo = > ", localVideo)
          textPublish.innerHTML = 'published';
          break;
        case 'failed':
          transport.close();
          textPublish.innerHTML = 'failed';
          break;
        default:
          break;
      }
    });
    //connection state change end

    try {
      stream = await getUserMedia(transport, isWebcam);
      const track = stream.getVideoTracks()[0]
      const params = { track };
      console.log('parameters => ', params)
      producer = await transport.produce(params)
      console.log("producer", producer)
    } catch (error) {
      console.error(error);

    }

  }
  const onRouterCapabilities = (resp) => {
    loadDevice(resp.data);
  }
  publish = () => {

    const msg = {
      type: "createProducerTransport",
      forceTcp: false,
      rtpCapabilities: device.rtpCapabilities
    }
    const resp = JSON.stringify(msg);
    socket.send(resp);
  }
  subscribe = () => {

    const msg = {
      type: "createConsumerTransport",
      forceTcp: false,

    }
    const resp = JSON.stringify(msg);
    socket.send(resp);
  }
  const IsJsonString = (str) => {
    try {
      JSON.parse(str)
    } catch (error) {
      return false
    }
    return true
  }



  const loadDevice = async (routerRtpCapabilities) => {

    try {
      device = new mediasoup.Device();

    } catch (error) {
      if (error.name == 'UnsupportedError') {
        console.log("browser not supported")
      }
    }
    await device.load({ routerRtpCapabilities })
  }
  const getUserMedia = async (transport, iswebcam) => {
    if (!device.canProduce('video')) {
      console.error('cannot produce video')
      return
    }
    let stream;
    try {
      stream =
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      // await navigator.mediaDevices.getDisplayMedia({ video: true })
    } catch (error) {
      console.error(error)
      throw error
    }
    return stream;
  }
  return (
    <div className="App">
      <Main subscribedStream={subscribedStream} publish={publish} localVideo={webcamStream} subscribe={subscribe}></Main>
    </div>
  );

}


export default App;

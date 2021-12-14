


import ReactPlayer from 'react-player'
import { Button } from './Button';

import { useState, useEffect, useRef } from 'react';

const mediasoup = require('mediasoup-client')
const { v4: uuidV4 } = require('uuid');
const websockerUri = 'https://angry-squid-20.loca.lt/'





const Main = ({ ...props }) => {


    console.log("subscribed", props.subscribedStream)
    console.log("--video")

    return (
        <div>
            <ReactPlayer url={props.localVideo} playing controls />

            {/* <video ref={() => myVideo} autoPlay width="750" height="500" controls >

            </video> */}
            <Button onClick={() => { props.publish() }}>publish</Button>
            <Button onClick={() => { props.subscribe() }}>subscribe</Button>
            <ReactPlayer url={props.subscribedStream} playing controls />


        </div>
    );
};


export default Main;
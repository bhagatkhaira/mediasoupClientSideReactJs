import ReactPlayer from 'react-player'



export const Video = (props) => {




    console.log("props", props)

    return (
        <div>
            <ReactPlayer url={props.stream} playing controls />
            {/* <video autoPlay width="750" height="500" controls >
                <source src={props.stream} />
            </video> */}


        </div>
    );
};
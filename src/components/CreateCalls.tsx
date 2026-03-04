import { useEffect, useState } from "react";

import VideoRoom from "./VideoRoom";
import { Link } from "react-router-dom";
// const websocketUrl = import.meta.env.WEBSOCKET_URL;


function Index() {

  const [start, setStart] = useState(false);
  
  const [socket, setSocket] = useState<WebSocket | null>(null);



 
  useEffect(() => {
    (async function () {
      const ws = new WebSocket("wss://video-calling-backend-1f0q.onrender.com");
     
      
      setSocket(ws);
    })();

    return (() => {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    });
  }, []);
 

  return (
  <>

    <div className="flex flex-col items-center mt-5 h-screen">

      <h1 className="text-2xl font-bold m-2">Welcome to the web app</h1>
      <div className="flex flex-col items-center gap-2" >
        <div className="bg-blue-500 text-white p-2 rounded-md" >
          <Link to={'/join'}>join Room</Link>
        </div>
        {!start &&  <button onClick={() => setStart(true)} className="bg-blue-500 text-white p-2 rounded-md">Create Room</button>}
        {start &&  <VideoRoom socket={socket!} /> }
      </div>

      </div>
      
   
  </>
  );
}

export default Index;
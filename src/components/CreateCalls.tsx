import { useEffect, useState } from "react";

import VideoRoom from "./VideoRoom";
import { Link } from "react-router-dom";


/**
* The main component of the application that sets up a WebSocket connection and handles room creation.
* @example
* App()
* // Renders the main application interface.
* @returns {JSX.Element} The main UI component of the application.
* @description
*   - Utilizes useEffect to establish a WebSocket connection and clean up upon component unmount.
*   - Manages state for WebSocket, start status, and token using useState.
*   - Renders UI elements conditionally based on state, including a button to create a room and an input for room ID.
*/
function Index() {

  const [start, setStart] = useState(false);
  // const [option, setOption] = useState<"Create" | "join" >();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  // const [token, setToken] = useState("");


/**
  * Initializes a WebSocket connection and cleans up on unmount.
  * @example
  * () => {
  *   (async function () {
  *     const ws = new WebSocket("ws://localhost:3001");
  *     setSocket(ws);
  *   })();
  *   return (() => {
  *     if (socket) {
  *       socket.close();
  *       setSocket(null);
  *     }
  *   });
  * }
  * @returns {Function} A cleanup function that closes the WebSocket connection.
  * @description
  *   - Establishes a WebSocket connection to "ws://localhost:3001".
  *   - Sets the WebSocket instance to the state variable `socket`.
  *   - The cleanup function ensures the WebSocket is closed and state is reset to null on component unmount or re-render.
  */
 
  useEffect(() => {
    (async function () {
      const ws = new WebSocket("ws://localhost:3001");
     
      
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
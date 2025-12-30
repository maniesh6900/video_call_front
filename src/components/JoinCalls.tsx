import { useEffect, useState } from 'react';
import JoinCallPlayer from './JoinCallPlayer';

function JoinCalls() {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [start, setStart] = useState<boolean>(false);
    const [chennal, setChennal] = useState<string | null>(null);

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
            {!start && 
            <>  
            <div className='flex gap-2 border rounded-md '>
                <input 
                    type="text" 
                    placeholder='Enter Token to join Meet'
                    value={chennal as string}
                    onChange={(e)=>{setChennal(e.target.value);}} 
                    className='focus:outline-none p-2'
                />
                <button onClick={() => setStart(true)} className="bg-blue-500 text-white p-2 rounded">Enter</button>
            </div>
            </> }
            {start && <JoinCallPlayer _chennal={chennal!} socket={socket!} /> }
    
            </div>
       
      </>
  );
}

export default JoinCalls;
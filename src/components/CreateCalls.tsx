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
    <div className="min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-200/70 bg-white/75 p-6 shadow-xl backdrop-blur-md sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Video Chat</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Host a room in one click</h1>
              <p className="mt-2 text-sm text-slate-600">Create and share your call with teammates instantly.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/join"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
              >
                Join Room
              </Link>
              {!start && (
                <button
                  onClick={() => setStart(true)}
                  disabled={!socket}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {socket ? "Create Room" : "Connecting..."}
                </button>
              )}
            </div>
          </div>

          {start && socket && <VideoRoom socket={socket} />}
        </div>
      </div>
    </div>
      
   
  </>
  );
}

export default Index;

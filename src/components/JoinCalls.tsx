import { useEffect, useState } from 'react';
import JoinCallPlayer from './JoinCallPlayer';
import { Link } from 'react-router-dom';
// const websocketUrl = import.meta.env.WEBSOCKET_URL;
function JoinCalls() {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [start, setStart] = useState<boolean>(false);
    const [chennal, setChennal] = useState<string>("");

    useEffect(() => {
        (function () {
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
          <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200/70 bg-white/75 p-6 shadow-xl backdrop-blur-md sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Join Meeting</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">Enter with your room token</h1>
                <p className="mt-2 text-sm text-slate-600">Paste the meeting token you received from the host.</p>
              </div>
              <Link
                to="/"
                className="w-fit rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
              >
                Back to Host
              </Link>
            </div>

            {!start && (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  placeholder="Enter token to join"
                  value={chennal}
                  onChange={(e) => {
                    setChennal(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
                <button
                  onClick={() => setStart(true)}
                  disabled={!socket || !chennal.trim()}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {!socket ? "Connecting..." : "Join Now"}
                </button>
              </div>
            )}

            {start && socket && <JoinCallPlayer _chennal={chennal} socket={socket} />}
          </div>
        </div>
       
      </>
  );
}

export default JoinCalls;

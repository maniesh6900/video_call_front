import React, { useEffect } from 'react';

function VideoPlayer({ user }: any) {
    const ref = React.useRef(null);
    useEffect(() => {
        user?.videoTrack.play(ref.current);
    }, [user]);


    return (
        <div className="w-[320px] max-w-full rounded-2xl border border-slate-200 bg-slate-950 p-2 shadow-lg">
            <div className='aspect-video overflow-hidden rounded-xl border border-slate-700 bg-slate-900'>
                <div ref={ref} className="h-full w-full"></div>
            </div>
            <p className='px-2 pt-2 text-xs font-medium text-slate-200'>User ID: {user?.uid}</p>
        </div>
    );
}

export default VideoPlayer;

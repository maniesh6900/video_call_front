import React, { useEffect } from 'react';

function VideoPlayer({ user, token }: any) {
    const ref = React.useRef(null);
    useEffect(() => {
        user?.videoTrack.play(ref.current);
    }, [user]);


    return (
        <div>
            <div className='w-64 h-64 border-2 border-gray-500 rounded-md'>
                <div ref={ref} className="w-full h-full"></div>
                <p className='text-center text-sm mt-2'>User ID: {user?.uid}</p>
                <label className='m-2'>Token:</label>
                    <input type="text" value={token} />
            </div>
        </div>
    );
}

export default VideoPlayer;
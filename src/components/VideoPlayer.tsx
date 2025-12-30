import React, { useEffect } from 'react';

/**
* Renders a video player component for a specified user.
* @example
* VideoPlayer({ user: sampleUser, Token: sampleToken })
* <div>...</div>
* @param {Object} { user, Token } - An object containing the user and token information to be used in the video player.
* @returns {JSX.Element} The JSX markup for the video player component.
* @description
*   - Uses a React ref to manage the DOM node for video playback.
*   - Utilizes useEffect to play the user's video track upon component mount.
*   - The component layout adjusts for the specified dimensions and displays user details.
*/
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
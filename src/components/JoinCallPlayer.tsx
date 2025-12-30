import { useEffect, useRef, useState } from 'react';
import AgoraRTC from "agora-rtc-sdk-ng";
import VideoPlayer from './VideoPlayer';
const appId = import.meta.env.VITE_APP_ID; 
const channel = import.meta.env.VITE_CHANNEL_NAME;
const _uid = Math.floor(100000 + Math.random() * 900000);
import axios from "axios";


const client = AgoraRTC.createClient({
    mode: "rtc",
    codec: "vp8", 
});


function JoinCallPlayer({_chennal, socket} : { socket : WebSocket, _chennal : string} ) {
    const [users, setUsers] = useState<any[]>([]);
    const [currUser, setCurrUser] = useState<any>();
    const [audio, setAudio] = useState<boolean>(false);
    const [token, setToken] = useState<string>();// send token via cookies,
    const [isJoined, setIsJoined] = useState(false);
    const localTracksRef = useRef<any[]>([]);
    console.log(_chennal);
    
    const handleUserPublished = async (user: any, mediaType: any) => {
        try {
            await client.subscribe(user, mediaType);
            
            if (mediaType === "video") {
                setUsers((prevUsers) => {
                    // Check if user already exists to avoid duplicates
                    const existingUser = prevUsers.find(u => u.uid === user.uid);
                    if (existingUser) {
                        return prevUsers.map(u => (u.uid === user.uid ? user : u));
                    }
                    return [...prevUsers, user];
                });
            }
            
            if (mediaType === "audio" && user.audioTrack) {
                user.audioTrack.play();
            }
        } catch (error) {
            console.error("Error handling user published:", error);
        }
    };

     const handleUserLeft = async (user: any) => {
        console.log("User leaving:", user.uid);
        setUsers((prevUsers) => prevUsers.filter((u) => u.uid !== user.uid));
    };
    
    useEffect(() => {
        const fetchToken = async () => {
            try {
                const res = await axios.post("http://localhost:3000/api/v1/user/token", { channel, _uid});
                setToken(res.data.data.token);
                // console.log("Token received:", res.data.data.token);
            } catch (error) {
                console.error("Error fetching token:", error);
            }
        };
        fetchToken();
    }, [users]);


      useEffect(() => {
        if (!token || !socket || isJoined) {
            return;
        }

        const joinRoom = async () => {
            try {
                // Set up event listeners
                client.on("user-published", handleUserPublished);
                client.on("user-left", handleUserLeft);
                
                // Join the Agora channel
                const uid = await client.join(appId, channel, token, _uid );    
                console.log("Joined Agora channel with UID:", uid);

                // Create local tracks
                const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
                const [audioTrack, videoTrack] = tracks;
                localTracksRef.current = tracks;

                // Publish local tracks
                await client.publish(tracks);
                
                // Add local user to users list
                setUsers([{
                    uid,
                    videoTrack,
                    audioTrack,
                    isLocal : true,
                }]);

                setIsJoined(true);

                // Join the WebSocket room
               

            } catch (error) {
                console.error("Error joining room:", error);
            }
            };

        // leaveRoom();
            joinRoom();

        // Cleanup function
            return () => {
                if (isJoined) {
                    leaveRoom();
                }
            };
    }, [token,  users]);

    const handleWebSocketMessage = (message : any) => {
        switch(message.type) {
            case "joined" : 
                console.log("Successfully joined room");
                setCurrUser({
                    id: message.payload.userId,
                    meetId: message.payload.meetId,
                });
                break;
            case "user-left" : 
               
            break;
        }
    };

     useEffect(()=> {
             // Set up WebSocket message handler
            try {
                 socket.onmessage = (event: MessageEvent) => {
                     try {
                         const message = JSON.parse(event.data);
                         handleWebSocketMessage(message);
                        } catch (error) {
                            console.error("Error parsing WebSocket message:", error);
                        }
                    };
            }catch(err) {
                console.error("new Errors  ",err);
                
            }
             return()=> {
                socket.send(JSON.stringify({
                    type : "user-left",
                    payload: {
                        userId : _uid,
                    },
                }));
                socket.close();
             };
    
    },[]);

/**
    * Handles the process of leaving the Agora room, unpublishing tracks, and notifying the server.
    * @example
    * leaveRoom()
    * No return value; room resources are properly cleaned up.
    * @returns {void} No explicit return value.
    * @description
    *   - Unpublishes local media tracks from the Agora client and cleans up resources.
    *   - Leaves the Agora channel and removes related event listeners.
    *   - Notifies the server through a WebSocket message of the user's departure.
    *   - Resets local state to reflect the user has left the room.
    */
    const leaveRoom = async () => {
        try {
            // Unpublish and destroy local tracks
            if (localTracksRef.current.length > 0) {
                await client.unpublish(localTracksRef.current);
                localTracksRef.current.forEach(track => track.close());
                localTracksRef.current = [];
            }

            // Leave Agora channel
            await client.leave();

            // Remove event listeners
            client.off("user-published", handleUserPublished);
            client.off("user-left", handleUserLeft);

            // Notify WebSocket server
            if (socket.readyState === WebSocket.OPEN && currUser) {
                socket.send(JSON.stringify({
                    type: "user-left",
                    payload: {
                        userId: currUser.userId,
                    },
                }));
            }

            // Reset state
            setUsers([]);
            setIsJoined(false);
            setCurrUser(null);

        } catch (error) {
            console.error("Error leaving room:", error);
        }
    };


     const handleLeaveClick = () => {
        leaveRoom();
    };

/**
    * Toggles the audio state between muted and unmuted.
    * @example
    * handleAudioToggle()
    * // Flips the current audio state from true to false or vice versa.
    * @returns {void} No return value.
    * @description
    *   - Updates the audio state by negating its current boolean value.
    */
    const handleAudioToggle = () => {
        setAudio(!audio);
    };
    
    return (<>
    <div className="flex flex-wrap justify-center gap-4">
                {users.map((user) => (
                    <div key={user.uid} className="relative  ">
                        <VideoPlayer token={token!} user={user} />
                        {user.isLocal && (<>
                            <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-sm">
                                You
                            </div>
                            <button
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
                                onClick={handleLeaveClick}
                            >
                                Leave
                            </button>
                            <button
                                className={`${audio ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'} text-white px-4 py-2 rounded-md transition-colors`}
                                onClick={handleAudioToggle}
                            >
                                {user?.audioTrack.muted ? "Mute" : "Unmute"}
                            </button> 
                        </>
                        )}
                    </div>
                ))}
            </div>
  
    </>

);
}

export default JoinCallPlayer;
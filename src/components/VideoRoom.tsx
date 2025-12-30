import AgoraRTC from "agora-rtc-sdk-ng";
import { useEffect, useRef, useState } from "react";
import VideoPlayer from "./VideoPlayer";
import axios from "axios";
const _uid = Math.floor(100000 + Math.random() * 900000);
const appId = import.meta.env.VITE_APP_ID; 
const channel = import.meta.env.VITE_CHANNEL_NAME;
let _token;
const client = AgoraRTC.createClient({
    mode: "rtc",
    codec: "vp8", 
});

/**
* VideoRoom is a React component that manages a video room using AgoraRTC and WebSocket.
* @example
* <VideoRoom socket={websocket} />
* <div className="flex justify-center items-center h-screen">Loading...</div>
* @param {Object} {socket: WebSocket} - A WebSocket instance for handling real-time communication.
* @returns {JSX.Element} A JSX element displaying the video room with users' video feeds and control buttons.
* @description
*   - Manages AgoraRTC client state for joining, publishing, and leaving a video room.
*   - Handles WebSocket interactions for user presence and updates in the video room.
*   - Offers user interface controls to toggle audio and leave the room.
*   - Reacts to state changes with hooks like useState and useEffect for asynchronous operations.
*/
export default function VideoRoom({ socket }: { socket: WebSocket }) {
    const [users, setUsers] = useState<any[]>([]);
    const [currUser, setCurrUser] = useState<any>();
    const [audio, setAudio] = useState<boolean>(false);
    const [token, setToken] = useState<string>();// send token via cookies,
    const [isJoined, setIsJoined] = useState(false);
    const localTracksRef = useRef<any[]>([]);

    // Fetch token on component mount
/**
    * Fetches a token from the server to authenticate the user in the video call.
    * @example
    * fetchToken()
    * // Outputs: Token received: XYZ123TOKEN
    * @returns {void} No return value.
    * @description
    *   - Makes a POST request to the server to obtain a token.
    *   - Upon success, updates the component's state with the received token.
    *   - Logs the token to the console upon successful retrieval.
    *   - Catches and logs any errors encountered during the token fetching process.
    */
    useEffect(() => {
        const fetchToken = async () => {
            try {
                const res = await axios.post("http://localhost:3000/api/v1/user/token", { channel, _uid});
                setToken(res.data.data.token);
                _token = res.data.data.token;
                console.log("Token received:", res.data.data.token);
            } catch (error) {
                console.error("Error fetching token:", error);
            }
        };
        fetchToken();
    }, [currUser, users]);
    
/**
    * Handles the event when a user publishes their media track in the Agora channel.
    * @example
    * handleUserPublished(user, "video")
    * No explicit return; handles user state updates and plays audio if applicable.
    * @param {any} user - The user object whose media track has been published.
    * @param {any} mediaType - The type of media track ("video" or "audio") being published.
    * @returns {void} No explicit return, modifies state and handles media accordingly.
    * @description
    *   - Subscribes to the user's published media track based on the media type.
    *   - Updates the local users state to include the new user if they are publishing video, ensuring no duplicates.
    *   - Automatically plays the audio track if the media type is audio and the audio track exists.
    */
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
    

/**
    * Handles the removal of a user from the local state when they leave the Agora channel.
    * @example
    * handleUserLeft(user)
    * No explicit return; updates the local users state.
    * @param {any} user - The user object that is leaving the channel.
    * @returns {void} No explicit return, updates internal state.
    * @description
    *   - Logs the UID of the user who is leaving.
    *   - Filters out the leaving user from the local users state.
    */
    const handleUserLeft = async (user: any) => {
        console.log("User leaving:", user.uid);
        setUsers((prevUsers) => prevUsers.filter((u) => u.uid !== user.uid));
    };
/**
    * Processes incoming WebSocket messages and updates user state accordingly
    * @example
    * handleWebSocketMessage({ type: "joined", payload: { userId: 123, meetId: 456 } })
    * // Outputs: Successfully joined room
    * @param {any} message - The WebSocket message object containing type and payload.
    * @returns {void} No explicit return, updates state based on message type.
    * @description
    *   - Specifically handles "joined" message type to set the current user.
    *   - Logs a success message when a "joined" message is processed.
    */
    const handleWebSocketMessage = (message : any) => {
        switch(message.type) {
            case "joined" : 
                console.log("Successfully joined room");
                setCurrUser({
                    id: message.payload.userId,
                    meetId: message.payload.meetId,
                });
                
                break;
        }
    };

/**
    * Sets up a WebSocket message handler and defines cleanup activities for the handler.
    * @example
    * () => { ... }
    * @param {void} No parameters are explicitly passed to this function.
    * @returns {function} Returns a cleanup function that handles sending a "user-left" message and closes the WebSocket connection.
    * @description
    *   - Parses incoming WebSocket messages and handles them using `handleWebSocketMessage`.
    *   - Logs errors that occur during the parsing of WebSocket messages.
    *   - Ensures the message captures user leaving information before closing the WebSocket.
    */
    useEffect(()=> {
         // Set up WebSocket message handler
         socket.onmessage = (event: MessageEvent) => {
             try {
                 const message = JSON.parse(event.data);
                 handleWebSocketMessage(message);
             } catch (error) {
                 console.error("Error parsing WebSocket message:", error);
             }
         };
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

    // Handle audio mute/unmute
/**
    * Toggles the mute state of the local audio track.
    * @example
    * () => { /* mute or unmute logic * / }
    * No return value
    * @description
    *   - Checks for the presence of an audio track in localTracksRef.
    *   - Toggles the muted state of the audio track based on the audio state.
    *   - Does nothing if no audio track is found.
    */
    useEffect(() => {
        if (localTracksRef.current.length > 0) {
            const audioTrack = localTracksRef.current.find(track => track.trackMediaType === "audio");
            if (audioTrack) {
                if (audio) {
                    audioTrack.setMuted(false);
                } else {
                    audioTrack.setMuted(true);
                }
            }
        }
    }, [audio]);

    // Handle WebSocket messages
    // const handleWebSocketMessage = (message: any) => {
    //     console.log("Received message:", message);
        
    //     switch (message.type) {
    //         case "joined":
    //             console.log("Successfully joined room");
    //             setCurrUser({
    //                 userId: message.payload.userId,
    //                 meetId: message.payload.meetId,
    //             });
    //             break;
                
    //         case "user-joined":
    //             console.log("New user joined:", message.payload.userId);
    //             // Handle new user joining - they will appear when they publish their 
    //             setUsers([{
    //                 userId : message.payload.userId,
    //             }])
    //             break;
                
    //         case "user-left":
    //             console.log("User left:", message.payload.userId);
    //             // Remove user from local state if needed
    //             break;
                
    //         default:
    //             console.log("Unknown message type:", message.type);
    //     }
    // };

    // Main effect for joining the room
/**
    * Joins the video room and sets up the necessary tracks and event listeners.
    * @example
    * useEffect(() => {
    *   joinRoom();
    * }, [token, currUser, socket, isJoined, users]);
    * @returns {void} Initiates joining the video call room and sets up necessary resources.
    * @description
    *   - Checks all preconditions such as the presence of token, socket, and user ID before attempting to join.
    *   - Registers event listeners for user joining or leaving the call.
    *   - Responsible for creating and publishing microphone and camera tracks to the Agora channel.
    *   - Cleans up resources and removes event listeners when the component unmounts or conditions change.
    */
    useEffect(() => {
        if (!token || !socket || isJoined || !_uid) {
            return;
        }

        const joinRoom = async () => {
            try {
                // Set up event listeners
                client.on("user-published", handleUserPublished);
                client.on("user-left", handleUserLeft);
                
                // Join the Agora channel
                const uid = await client.join(appId, channel, token, _uid);
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

        joinRoom();

        // Cleanup function
        return () => {
            if (isJoined) {
                leaveRoom();
            }
        };
    }, [token, currUser, socket, isJoined, users]);

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

/**
    * Handles the user's action to leave the video room
    * @example
    * handleLeaveClick()
    * No explicit return; initiates the leaveRoom process.
    * @returns {void} No explicit return, triggers the function to leave the room.
    * @description
    *   - Calls the leaveRoom function to manage the user's exit from the video room.
    *   - This action ensures that resources are cleaned up and the user is properly disconnected from the room and Agora channel.
    */
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

    if (!token) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    return (
        <div className="flex flex-col items-center mt-5 h-screen">
            <div className="flex flex-wrap justify-center gap-4">
                {users.map((user) => (
                    <div key={user.uid} className="relative">
                        <VideoPlayer token={_token!} user={user} />
                        {user.isLocal && (
                            <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-sm">
                                You
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            <div className="flex gap-4 mt-16">
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
                    {audio ? "Mute" : "Unmute"}
                </button>
            </div>
            
            {currUser && (
                <div className="mt-4 text-center">
                    <p className="text-gray-600">User ID: {currUser.userId}</p>
                    <p className="text-gray-600">Meeting ID: {currUser.meetId}</p>
                    <p>Token : {token}</p>
                </div>
            )}
        </div>
    );
}
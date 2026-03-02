import { useEffect, useRef, useState } from 'react';
import AgoraRTC from "agora-rtc-sdk-ng";
import VideoPlayer from './VideoPlayer';
import axios from "axios";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setToken,
  setCurrentUser,
  setJoined,
  toggleMute,
  toggleCamera,
  toggleScreenShare,
  leaveCall,
} from "../store/callSlice";

const appId = import.meta.env.VITE_APP_ID;
const channel = import.meta.env.VITE_CHANNEL_NAME;
const _uid = Math.floor(100000 + Math.random() * 900000);

const client = AgoraRTC.createClient({
  mode: "rtc",
  codec: "vp8",
});

function JoinCallPlayer({ _chennal, socket }: { socket: WebSocket; _chennal: string }) {
  const dispatch = useAppDispatch();
  const { isMuted, isCameraOff, isScreenSharing, isJoined, token, currentUser } =
    useAppSelector((state) => state.call);

  const [users, setUsers] = useState<any[]>([]);
  const localTracksRef = useRef<any[]>([]);
  const screenTrackRef = useRef<any>(null);
  console.log(_chennal);

  const handleUserPublished = async (user: any, mediaType: any) => {
    try {
      await client.subscribe(user, mediaType);
      if (mediaType === "video") {
        setUsers((prevUsers) => {
          const existingUser = prevUsers.find((u) => u.uid === user.uid);
          if (existingUser) {
            return prevUsers.map((u) => (u.uid === user.uid ? user : u));
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
        const res = await axios.post("http://localhost:3000/api/v1/user/token", { channel, _uid });
        dispatch(setToken(res.data.data.token));
      } catch (error) {
        console.error("Error fetching token:", error);
      }
    };
    fetchToken();
  }, [dispatch]);

  useEffect(() => {
    if (!token || !socket || isJoined) return;
    const joinRoom = async () => {
      try {
        client.on("user-published", handleUserPublished);
        client.on("user-left", handleUserLeft);
        const uid = await client.join(appId, channel, token, _uid);
        console.log("Joined Agora channel with UID:", uid);
        const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        const [audioTrack, videoTrack] = tracks;
        localTracksRef.current = tracks;
        audioTrack.setMuted(true);
        await client.publish(tracks);

        setUsers([{ uid, videoTrack, audioTrack, isLocal: true }]);

        for (const remoteUser of client.remoteUsers) {
          if (remoteUser.hasVideo) {
            await handleUserPublished(remoteUser, "video");
          }
          if (remoteUser.hasAudio) {
            await handleUserPublished(remoteUser, "audio");
          }
        }
        dispatch(setJoined(true));
      } catch (error) {
        console.error("Error joining room:", error);
      }
    };
    joinRoom();
    return () => { if (isJoined) leaveRoom(); };
  }, [token, isJoined]);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case "joined":
        console.log("Successfully joined room");
        dispatch(setCurrentUser({ userId: message.payload.userId, meetId: message.payload.meetId }));
        break;
      case "user-left":
        break;
    }
  };

  useEffect(() => {
    try {
      socket.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
    } catch (err) {
      console.error("new Errors  ", err);
    }
    return () => {
      socket.send(JSON.stringify({ type: "user-left", payload: { userId: _uid } }));
      socket.close();
    };
  }, []);

  const leaveRoom = async () => {
    try {
      if (screenTrackRef.current) {
        await client.unpublish(screenTrackRef.current);
        screenTrackRef.current.close();
        screenTrackRef.current = null;
      }
      if (localTracksRef.current.length > 0) {
        await client.unpublish(localTracksRef.current);
        localTracksRef.current.forEach((track) => track.close());
        localTracksRef.current = [];
      }
      await client.leave();
      client.off("user-published", handleUserPublished);
      client.off("user-left", handleUserLeft);
      if (socket.readyState === WebSocket.OPEN && currentUser) {
        socket.send(JSON.stringify({ type: "user-left", payload: { userId: currentUser.userId } }));
      }
      setUsers([]);
      dispatch(leaveCall());
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  };

  const handleLeaveClick = () => { leaveRoom(); };

  const handleMuteToggle = () => {
    const audioTrack = localTracksRef.current.find((track) => track.trackMediaType === "audio");
    if (audioTrack) audioTrack.setMuted(!isMuted);
    dispatch(toggleMute());
  };

  const handleCameraToggle = () => {
    const videoTrack = localTracksRef.current.find((track) => track.trackMediaType === "video");
    if (videoTrack) videoTrack.setMuted(!isCameraOff);
    dispatch(toggleCamera());
  };

  const handleScreenShareToggle = async () => {
    try {
      if (!isScreenSharing) {
        const screenTrack = await AgoraRTC.createScreenVideoTrack({});
        const videoTrack = localTracksRef.current.find((track) => track.trackMediaType === "video");
        if (videoTrack) await client.unpublish(videoTrack);
        await client.publish(screenTrack);
        screenTrackRef.current = screenTrack;
        dispatch(toggleScreenShare());
      } else {
        if (screenTrackRef.current) {
          await client.unpublish(screenTrackRef.current);
          screenTrackRef.current.close();
          screenTrackRef.current = null;
        }
        const videoTrack = localTracksRef.current.find((track) => track.trackMediaType === "video");
        if (videoTrack) await client.publish(videoTrack);
        dispatch(toggleScreenShare());
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
    }
  };

  return (
    <>
      <div className="flex flex-wrap justify-center gap-4">
        {users.map((user) => (
          <div key={user.uid} className="relative">
            <VideoPlayer token={token!} user={user} />
            {user.isLocal && (
              <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-sm">You</div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-8">
        <button className={"" + (isMuted ? "bg-gray-500 hover:bg-gray-600" : "bg-green-500 hover:bg-green-600") + " text-white px-4 py-2 rounded-md transition-colors"} onClick={handleMuteToggle}>{isMuted ? "Unmute" : "Mute"}</button>
        <button className={"" + (isCameraOff ? "bg-gray-500 hover:bg-gray-600" : "bg-green-500 hover:bg-green-600") + " text-white px-4 py-2 rounded-md transition-colors"} onClick={handleCameraToggle}>{isCameraOff ? "Turn On Camera" : "Turn Off Camera"}</button>
        <button className={"" + (isScreenSharing ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-500 hover:bg-gray-600") + " text-white px-4 py-2 rounded-md transition-colors"} onClick={handleScreenShareToggle}>{isScreenSharing ? "Stop Sharing" : "Share Screen"}</button>
        <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors" onClick={handleLeaveClick}>End Call</button>
      </div>
    </>
  );
}

export default JoinCallPlayer;

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
// const backend = import.meta.env.BACKEND_URL;

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
        const res = await axios.post(`https://video-calling-backend-1f0q.onrender.com/api/v1/user/token`, { channel, _uid });
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
      <div className="mt-8 grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {users.map((user) => (
          <div key={user.uid} className="relative">
            <VideoPlayer user={user} />
            {user.isLocal && (
              <div className="absolute left-4 top-4 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white shadow-sm">You</div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-8 flex w-full flex-wrap justify-center gap-3 rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-sm">
        <button className={"" + (isMuted ? "bg-slate-500 hover:bg-slate-600" : "bg-emerald-600 hover:bg-emerald-700") + " rounded-xl px-4 py-2 text-sm font-semibold text-white transition"} onClick={handleMuteToggle}>{isMuted ? "Unmute" : "Mute"}</button>
        <button className={"" + (isCameraOff ? "bg-slate-500 hover:bg-slate-600" : "bg-emerald-600 hover:bg-emerald-700") + " rounded-xl px-4 py-2 text-sm font-semibold text-white transition"} onClick={handleCameraToggle}>{isCameraOff ? "Turn On Camera" : "Turn Off Camera"}</button>
        <button className={"" + (isScreenSharing ? "bg-sky-600 hover:bg-sky-700" : "bg-slate-500 hover:bg-slate-600") + " rounded-xl px-4 py-2 text-sm font-semibold text-white transition"} onClick={handleScreenShareToggle}>{isScreenSharing ? "Stop Sharing" : "Share Screen"}</button>
        <button className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700" onClick={handleLeaveClick}>End Call</button>
      </div>
      {currentUser && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white/85 px-4 py-3 text-center shadow-sm">
          <p className="text-sm text-slate-600">User ID: {currentUser.userId}</p>
          <p className="text-sm text-slate-600">Meeting ID: {currentUser.meetId}</p>
        </div>
      )}
    </>
  );
}

export default JoinCallPlayer;

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface Participant {
  uid: number;
  isLocal: boolean;
}

interface CurrentUser {
  userId: string;
  meetId: string;
}

interface CallState {
  isJoined: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  currentUser: CurrentUser | null;
  token: string | null;
  participants: Participant[];
}

const initialState: CallState = {
  isJoined: false,
  isMuted: true,
  isCameraOff: false,
  isScreenSharing: false,
  currentUser: null,
  token: null,
  participants: [],
};

const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
    },
    setCurrentUser(state, action: PayloadAction<CurrentUser>) {
      state.currentUser = action.payload;
    },
    setJoined(state, action: PayloadAction<boolean>) {
      state.isJoined = action.payload;
    },
    toggleMute(state) {
      state.isMuted = !state.isMuted;
    },
    toggleCamera(state) {
      state.isCameraOff = !state.isCameraOff;
    },
    toggleScreenShare(state) {
      state.isScreenSharing = !state.isScreenSharing;
    },
    addParticipant(state, action: PayloadAction<Participant>) {
      const exists = state.participants.find((p) => p.uid === action.payload.uid);
      if (!exists) {
        state.participants.push(action.payload);
      }
    },
    removeParticipant(state, action: PayloadAction<number>) {
      state.participants = state.participants.filter((p) => p.uid !== action.payload);
    },
    leaveCall() {
      return initialState;
    },
  },
});

export const {
  setToken,
  setCurrentUser,
  setJoined,
  toggleMute,
  toggleCamera,
  toggleScreenShare,
  addParticipant,
  removeParticipant,
  leaveCall,
} = callSlice.actions;

export default callSlice.reducer;

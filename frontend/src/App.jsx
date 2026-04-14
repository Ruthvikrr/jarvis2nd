import React, { useState, useEffect, useRef } from 'react';
import Visualizer from './components/Visualizer';

const SOCKET_URL = 'ws://localhost:8000/ws/voice';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [useSpeechRecognition, setUseSpeechRecognition] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [wsStatus, setWsStatus] = useState('Connecting...');
  const [jarvisState, setJarvisState] = useState('Idle');

  const ws = useRef(null);
  const audioContext = useRef(null);
  const analyser = useRef(null);
  const nextStartTime = useRef(0);

  useEffect(() => {
    connectWebSocket();
    return () => ws.current?.close();
  }, []);

  const connectWebSocket = () => {
    setWsStatus('Connecting...');
    ws.current = new WebSocket(SOCKET_URL);
    ws.current.onopen = () => setWsStatus('System Online');
    ws.current.onclose = () => {
        setWsStatus('System Offline');
        setTimeout(connectWebSocket, 3000);
    };
    ws.current.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'audio_chunk') {
        setJarvisState('Speaking');
        playAudioChunk(data.audio);
      } else if (data.type === 'stream_end') {
        setTimeout(() => setJarvisState('Idle'), 500);
      }
    };
  };

  const playAudioChunk = async (base64Audio) => {
    try {
      if (!audioContext.current) return;
      if (audioContext.current.state === 'suspended') await audioContext.current.resume();
      const binaryString = window.atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const audioBuffer = await audioContext.current.decodeAudioData(bytes.buffer);
      const source = audioContext.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser.current);
      source.connect(audioContext.current.destination);
      const currentTime = audioContext.current.currentTime;
      if (nextStartTime.current < currentTime) nextStartTime.current = currentTime;
      source.start(nextStartTime.current);
      nextStartTime.current += audioBuffer.duration;
    } catch (e) {
      console.error("Audio Playback Failed:", e);
    }
  };

  const forceDiagnostic = async () => {
    if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
        analyser.current = audioContext.current.createAnalyser();
        analyser.current.connect(audioContext.current.destination);
    }
    setJarvisState('Thinking');
    if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ text: "System check complete. I am online and functional, sir.", type: 'text' }));
    } else {
        alert("WebSocket is not connected. Start the backend first.");
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
      <Visualizer analyser={analyser.current} state={jarvisState} />
      
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50">
        <button 
            onClick={forceDiagnostic}
            className="px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20 transition-all pointer-events-auto"
        >
            Diagnostic: Force Test Signal
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-8 pointer-events-none">
        <div className="p-12 w-full max-w-md bg-neutral-900/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 pointer-events-auto shadow-2xl">
          <h1 className="text-4xl font-black mb-1 bg-gradient-to-b from-white to-white/30 bg-clip-text text-transparent italic tracking-tighter">JARVIS</h1>
          
          <div className="flex items-center justify-center gap-2 mb-10 mt-2">
            <div className={`w-1.5 h-1.5 rounded-full ${
                jarvisState === 'Thinking' ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' :
                jarvisState === 'Speaking' ? 'bg-purple-500 shadow-[0_0_10px_#a855f7]' :
                jarvisState === 'Listening' ? 'bg-blue-400 shadow-[0_0_10px_#60a5fa]' : 'bg-white/10'
            }`} />
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-mono">{jarvisState}</span>
          </div>

          <button
            onClick={() => setIsListening(!isListening)}
            className={`w-full py-5 rounded-3xl font-black transition-all mb-8 tracking-widest text-sm ${
              isListening ? 'bg-red-500 text-white' : 'bg-white text-black hover:scale-105'
            }`}
          >
            {isListening ? 'DISABLE LINK' : 'INITIALIZE LINK'}
          </button>

          <p className="text-[9px] uppercase tracking-[0.4em] text-white/10 font-mono italic">{wsStatus}</p>
        </div>
      </div>
    </div>
  );
}

export default App;

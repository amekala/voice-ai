"use client";
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toWav from 'audiobuffer-to-wav';

const Home = () => {
    const [audioUrl, setAudioUrl] = useState('');
    const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null); // Type is explicitly set to HTMLAudioElement

    useEffect(() => {
        if (audioUrl && audioRef.current) {
            audioRef.current.play();
        }
    }, [audioUrl]);


    const sendAudioToServer = async (wavBlob: Blob) => {
        const formData = new FormData();
        formData.append('file', wavBlob, 'recording.wav');

        try {
            const response = await axios.post('http://localhost:8000/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.status === 200 && response.data) {
                console.log('File uploaded to server and response received:', response.data);
                setAudioUrl(response.data.url); // If the server responds with a URL
            } else {
                console.error('Server responded with an error:', response);
            }
        } catch (error) {
            console.error('Error sending file to server:', error);
        }
    };

    const convertBlobUrlToWav = async (blobUrl: string) => {
        console.log('Fetching blob data from URL:', blobUrl);
        const response = await fetch(blobUrl);
        const audioBlob = await response.blob();
    

        console.log('Creating AudioContext and decoding audio data');
        const audioContext = new window.AudioContext || (window as any).webkitAudioContext;
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        console.log('Converting audio buffer to .wav format');
        const wav = toWav(audioBuffer);
        const wavBlob = new Blob([new DataView(wav)], { type: 'audio/wav' });
        console.log('WAV Blob created');

        return wavBlob;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const options = { mimeType: 'audio/webm' };
            const mediaRecorder = new MediaRecorder(stream, options);
            setRecorder(mediaRecorder);
    
            // Explicitly type audioChunks as BlobPart[]
            const audioChunks: BlobPart[] = [];
    
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const blobUrl = URL.createObjectURL(audioBlob); // Create a URL for the Blob
                const wavBlob = await convertBlobUrlToWav(blobUrl);
                console.log('WAV Blob:', wavBlob);
                await sendAudioToServer(wavBlob);
                setRecorder(null); // Reset the recorder state

            };

            mediaRecorder.start();
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    };

    const stopRecording = () => {
        if (recorder) {
            recorder.stop(); // This will eventually trigger the 'onstop' event
            setRecorder(null); // Reset the recorder state
        }
    };

    return (
        <>
            <section className="bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300 h-screen flex justify-center items-center">
                <div className="bg-white p-8 rounded-lg shadow-lg w-1/2 max-w-sm text-center">
                    <h1 className="text-3xl font-extrabold text-gray-800 mb-4">AI Sales Agent</h1>
                    {
                        recorder ? (
                            <button onClick={stopRecording} className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-full w-32 focus:outline-none">Stop</button>
                        ) : (
                            <button onClick={startRecording} className="bg-blue-500 hover:bg-blue-900 text-white font-semibold py-2 px-4 rounded-full w-32 focus:outline-none">Start</button>
                        )
                    }
                </div>
        <audio ref={audioRef} src={audioUrl} style={{ display: 'none' }} onEnded={() => setAudioUrl('')}>
            Your browser does not support the audio element.
        </audio>
    </section>
        </>
    );
}

export default Home;
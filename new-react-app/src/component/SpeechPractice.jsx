import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const SpeechPractice = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [feedback, setFeedback] = useState(null);

    // SpeechRecognition instance
    const recognitionRef = useRef(null);

    // Track pauses/duration
    const timeoutRef = useRef(null);            // for the pause timeout
    const lastWordTimeRef = useRef(new Date()); // track time of last recognized word
    const pauseTimeRef = useRef(0);             // accumulate total paused time (optional)

    useEffect(() => {
        // Check if the browser supports the Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Your browser does not support the Web Speech API. Please use Chrome/Edge.");
            return;
        }

        // Create the recognition instance:
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        // On speech result:
        recognition.onresult = (event) => {
            const lastResult = event.results[event.results.length - 1];
            // Rename the local variable to avoid clashing with state variable `transcript`
            const recognizedText = lastResult[0].transcript.trim();

            if (lastResult.isFinal) {
                // Clear any pending punctuation timeout
                clearTimeout(timeoutRef.current);

                const now = new Date();
                const timeDiff = (now - lastWordTimeRef.current) / 1000;

                // Simple punctuation based on pause length
                const punctuation = timeDiff > 1.5
                    ? "."
                    : timeDiff > 0.8
                        ? ","
                        : "";

                // Append the recognized text with punctuation
                setTranscript((prev) => `${prev.trim()}${punctuation} ${recognizedText}`);
                lastWordTimeRef.current = now;
            }

            // Handle punctuation on a timeout if user goes silent for 1.5s
            timeoutRef.current = setTimeout(() => {
                const now = new Date();
                const timeDiff = (now - lastWordTimeRef.current) / 1000;

                if (timeDiff > 1.5) {
                    // Track pause time
                    pauseTimeRef.current += timeDiff;

                    // Insert a period to mark a longer pause
                    setTranscript((prev) => `${prev.trim()}. `);
                    lastWordTimeRef.current = now;
                }
            }, 1500);
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
        };

        recognitionRef.current = recognition;
    }, []);

    const handleStart = () => {
        if (!recognitionRef.current) return;

        // Reset transcript and feedback
        setTranscript('');
        setFeedback(null);

        // Optionally reset pauseTime and lastWordTime here
        pauseTimeRef.current = 0;
        lastWordTimeRef.current = new Date();

        // Start recognition
        recognitionRef.current.start();
        setIsRecording(true);
    };

    const handleStop = () => {
        if (!recognitionRef.current) return;
        recognitionRef.current.stop();
        setIsRecording(false);
    };

    const handleSendFeedbackRequest = async () => {
        if (!transcript.trim()) return;

        try {
            // Example call to a punctuation feedback endpoint
            const res = await axios.post(
                "http://localhost:5000/api/punctuate/feedback",
                {
                    response: transcript,
                    // If you wish, you can also pass the total paused time:
                    // pausedTime: pauseTimeRef.current
                }
            );

            console.log("Feedback response:", res.data);
            setFeedback(res.data.feedback);
        } catch (error) {
            console.error('Error sending transcript for feedback:', error);
        }
    };

    return (
        <div style={{ marginTop: '1rem' }}>
            <button onClick={isRecording ? handleStop : handleStart}>
                {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>

            <div style={{ marginTop: '1rem', fontStyle: 'italic', border: '1px solid #ccc', padding: '1rem' }}>
                <strong>Transcript:</strong>
                <p>{transcript}</p>
            </div>

            <button onClick={handleSendFeedbackRequest} disabled={!transcript}>
                Get Pronunciation Feedback
            </button>

            {feedback && (
                <div style={{ marginTop: '1rem' }}>
                    <h3>Feedback</h3>
                    <pre>{JSON.stringify(feedback, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default SpeechPractice;

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import "./styles.css"

const SpeechPractice = () => {
    const [isRecording, setIsRecording] = useState(false);

    // Keep final (punctuated) transcript separate from interim text
    const [finalTranscript, setFinalTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');

    const [feedback, setFeedback] = useState(null);

    // NEW: loading state
    const [isLoading, setIsLoading] = useState(false);

    // SpeechRecognition instance
    const recognitionRef = useRef(null);

    // Track pauses/duration
    const timeoutRef = useRef(null);
    const lastWordTimeRef = useRef(new Date());
    const pauseTimeRef = useRef(0);

    useEffect(() => {
        // Check if the browser supports the Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Your browser does not support the Web Speech API. Please use Chrome/Edge.");
            return;
        }

        // Create the recognition instance
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        // On speech result
        recognition.onresult = (event) => {
            let tempInterim = '';

            // Process *all* results that have come in since last time
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const recognizedText = result[0].transcript.trim();

                if (result.isFinal) {
                    // Clear any pending punctuation timeout
                    clearTimeout(timeoutRef.current);

                    // Insert punctuation based on the gap since last final word
                    const now = new Date();
                    const timeDiff = (now - lastWordTimeRef.current) / 1000;
                    const punctuation = timeDiff > 1.5 ? "." : timeDiff > 0.8 ? "," : "";

                    // Update final transcript with punctuation + recognized text
                    setFinalTranscript((prev) => {
                        return `${prev.trim()}${punctuation} ${recognizedText}`;
                    });

                    // Reset the timer reference
                    lastWordTimeRef.current = now;
                } else {
                    // For non-final (interim) results, accumulate them
                    tempInterim += recognizedText + ' ';
                }
            }

            // Update the interim transcript state so user sees partial text
            setInterimTranscript(tempInterim);

            // Optional punctuation on timeout if user goes silent for 1.5s
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                const now = new Date();
                const timeDiff = (now - lastWordTimeRef.current) / 1000;
                if (timeDiff > 1.5) {
                    pauseTimeRef.current += timeDiff;
                    // Insert a period to mark a longer pause
                    setFinalTranscript((prev) => `${prev.trim()}. `);
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

        // Reset transcripts and feedback
        setFinalTranscript('');
        setInterimTranscript('');
        setFeedback(null);

        // Optionally reset pauseTime and lastWordTime
        pauseTimeRef.current = 0;
        lastWordTimeRef.current = new Date();

        recognitionRef.current.start();
        setIsRecording(true);
    };

    const handleStop = () => {
        if (!recognitionRef.current) return;
        recognitionRef.current.stop();
        setIsRecording(false);
    };

    const handleSendFeedbackRequest = async () => {
        // Combine final + interim transcripts if you want to send everything
        const combinedTranscript = (finalTranscript + ' ' + interimTranscript).trim();
        if (!combinedTranscript) return;

        try {
            // Show loading indicator
            setIsLoading(true);

            const res = await axios.post("http://localhost:5000/api/punctuate/feedback", {
                response: combinedTranscript,
                // pausedTime: pauseTimeRef.current,
            });

            console.log("Feedback response:", res.data);
            setFeedback(res.data.feedback.pronunciationFeedback);
        } catch (error) {
            console.error('Error sending transcript for feedback:', error);
            setFeedback('Error retrieving feedback. Please try again.');
        } finally {
            // Hide loading indicator
            setIsLoading(false);
        }
    };

    // finalTranscript is "confirmed" text with punctuation
    // interimTranscript is what's still "in progress"
    const displayTranscript = `${finalTranscript} ${interimTranscript}`.trim();

    return (
        <>
            <div className="app-heading">
                Correct Punctuation Speech APP
            </div>

            <div style={{ marginTop: '1rem' }}>
                <button onClick={isRecording ? handleStop : handleStart}>
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>

                <div
                    style={{
                        marginTop: '1rem',
                        fontStyle: 'italic',
                        border: '1px solid #ccc',
                        padding: '1rem'
                    }}
                >
                    <strong>Transcript:</strong>
                    <p>{displayTranscript}</p>
                </div>

                {/* Show loading status if request is in-progress */}
                {isLoading && (
                    <div style={{ color: 'blue', marginTop: '1rem' }}>
                        Processing your request...
                    </div>
                )}

                <button onClick={handleSendFeedbackRequest} disabled={!displayTranscript || isLoading}>
                    Get Pronunciation Feedback
                </button>

                {feedback && (
                    <div style={{ marginTop: '1rem' }}>
                        <h3>Feedback</h3>
                        <div style={{ whiteSpace: 'pre-line' }}>
                            {feedback}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default SpeechPractice;

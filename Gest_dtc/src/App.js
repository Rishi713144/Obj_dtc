import React, { useRef, useState, useEffect } from "react";

import * as tf from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/handpose";
import Webcam from "react-webcam";
import "./App.css";
import { drawHand } from "./utilities";

import * as fp from "fingerpose";
import {
  Finger,
  FingerCurl,
  FingerDirection,
  GestureDescription,
} from "fingerpose";

// Custom Gestures

// I Love You Gesture (ILY 🤟)
const ilyGesture = new GestureDescription("ily");

// Thumb: Extended sideways (horizontal), not down
ilyGesture.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
ilyGesture.addDirection(Finger.Thumb, FingerDirection.HorizontalLeft, 1.0);
ilyGesture.addDirection(Finger.Thumb, FingerDirection.HorizontalRight, 1.0);
ilyGesture.addDirection(Finger.Thumb, FingerDirection.DiagonalUpLeft, 0.7);
ilyGesture.addDirection(Finger.Thumb, FingerDirection.DiagonalUpRight, 0.7);
// Strictly disallow downward thumb
ilyGesture.addDirection(Finger.Thumb, FingerDirection.VerticalDown, 0.0);
ilyGesture.addDirection(Finger.Thumb, FingerDirection.DiagonalDownLeft, 0.0);
ilyGesture.addDirection(Finger.Thumb, FingerDirection.DiagonalDownRight, 0.0);

// Index and Pinky: Straight up
ilyGesture.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
ilyGesture.addDirection(Finger.Index, FingerDirection.VerticalUp, 1.0);

ilyGesture.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
ilyGesture.addDirection(Finger.Pinky, FingerDirection.VerticalUp, 1.0);

// Middle and Ring: Fully curled
ilyGesture.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
ilyGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);

// Extra weight on pinky
ilyGesture.setWeight(Finger.Pinky, 2);

// Namaste / Prayer Hands
const namasteGesture = new GestureDescription("namaste");
for (let finger of [Finger.Thumb, Finger.Index, Finger.Middle, Finger.Ring, Finger.Pinky]) {
  namasteGesture.addCurl(finger, FingerCurl.NoCurl, 1.0);
  namasteGesture.addDirection(finger, FingerDirection.VerticalUp, 1.0);
}
namasteGesture.setWeight(Finger.Index, 2);

// OK Sign
const okGesture = new GestureDescription("ok");
okGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0);
okGesture.addCurl(Finger.Index, FingerCurl.HalfCurl, 1.0);
for (let finger of [Finger.Middle, Finger.Ring, Finger.Pinky]) {
  okGesture.addCurl(finger, FingerCurl.NoCurl, 1.0);
  okGesture.addDirection(finger, FingerDirection.VerticalUp, 0.9);
}

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const [gestureText, setGestureText] = useState(null);
  const [prevGesture, setPrevGesture] = useState(null); 
  const gestureMessages = {
    yes: "YES! 👍",
    ily: "I LOVE YOU! 🤟❤️",
    namaste: "NAMASTE 🙏",
    peace: "PEACE! ✌️",
    ok: "OK! 👌",
  };

  const runHandpose = async () => {
    const net = await handpose.load();
    console.log("Handpose model loaded.");
    setInterval(() => {
      detect(net);
    }, 100);
  };

  const detect = async (net) => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      const video = webcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const hand = await net.estimateHands(video);

      if (hand.length > 0) {
        const GE = new fp.GestureEstimator([
          fp.Gestures.VictoryGesture,     // → peace
          fp.Gestures.ThumbsUpGesture,    // → yes
          ilyGesture,                     // → ILY
          namasteGesture,
          okGesture,
        ]);

        const gesture = await GE.estimate(hand[0].landmarks, 8.5);

        if (gesture.gestures !== undefined && gesture.gestures.length > 0) {
          const confidence = gesture.gestures.map((p) => p.confidence);
          const maxConfidenceIndex = confidence.indexOf(Math.max(...confidence));

          let detectedName = gesture.gestures[maxConfidenceIndex].name;

          // Map built-in names
          if (detectedName === "victory") detectedName = "peace";
          if (detectedName === "thumbs_up") detectedName = "yes";

          const message = gestureMessages[detectedName];

          // Simple debounce: only update if gesture changed
          if (message && detectedName !== prevGesture) {
            setGestureText(message);
            setPrevGesture(detectedName);
          } else if (!message) {
            setGestureText(null);
            setPrevGesture(null);
          }
        } else {
          setGestureText(null);
          setPrevGesture(null);
        }
      } else {
        setGestureText(null);
        setPrevGesture(null);
      }

      const ctx = canvasRef.current.getContext("2d");
      drawHand(hand, ctx);
    }
  };

  useEffect(() => {
    runHandpose();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <Webcam
          ref={webcamRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 9,
            width: 640,
            height: 480,
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 9,
            width: 640,
            height: 480,
          }}
        />

        {/* Big text overlay */}
        {gestureText && (
          <div
            style={{
              position: "absolute",
              bottom: 80,
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: "52px",
              fontWeight: "bold",
              color: "white",
              textShadow: "4px 4px 12px black",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            {gestureText}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
import React, { useRef, useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocossd from "@tensorflow-models/coco-ssd";
import Webcam from "react-webcam";
import "./App.css";
import { drawRect } from "./utilities";



function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const [detections, setDetections] = useState([]);
  const [isModelLoading, setIsModelLoading] = useState(true);

  // Load COCO-SSD model
  const loadModel = async () => {
    setIsModelLoading(true);

    const model = await cocossd.load({
      base: "lite_mobilenet_v2",
    });

    console.log("COCO-SSD model loaded.");
    setIsModelLoading(false);

    detectFrame(model);
  };

  // Detection loop
  const detectFrame = async (model) => {
    if (isVideoReady()) {
      const video = webcamRef.current.video;
      setCanvasSize(video);

      const predictions = await model.detect(video);
      setDetections(predictions);

      drawPredictions(predictions);
    }

    requestAnimationFrame(() => detectFrame(model));
  };

  // Helpers
  const isVideoReady = () => {
    return (
      webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4
    );
  };

  const setCanvasSize = (video) => {
    if (!canvasRef.current) return;

    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;
  };

  const drawPredictions = (predictions) => {
    const ctx = canvasRef.current.getContext("2d");
    drawRect(predictions, ctx);
  };

  useEffect(() => {
    loadModel();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {/* Webcam + Canvas */}
        <div style={styles.videoWrapper}>
          <Webcam ref={webcamRef} muted style={styles.webcam} />
          <canvas ref={canvasRef} style={styles.canvas} />

          {isModelLoading && <LoadingOverlay />}
        </div>

        {/* Detected Objects */}
        <DetectionList detections={detections} />
      </header>
    </div>
  );
}

/* ------------------ Components ------------------ */

const LoadingOverlay = () => (
  <div style={styles.loading}>
    Loading model...
  </div>
);

const DetectionList = ({ detections }) => {
  const visibleDetections = detections
    .filter((d) => d.score > 0.5)
    .sort((a, b) => b.score - a.score);

  return (
    <div style={styles.listContainer}>
      <h3 style={styles.listTitle}>
        Detected Objects ({detections.length})
      </h3>

      {visibleDetections.length === 0 ? (
        <p style={styles.emptyText}>No objects detected yet</p>
      ) : (
        <ul style={styles.list}>
          {visibleDetections.map((d, i) => (
            <li key={i} style={styles.listItem}>
              <span style={styles.objectName}>{d.class}</span>
              <span style={styles.score}>
                {(d.score * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ------------------ Styles ------------------ */

const styles = {
  videoWrapper: {
    position: "relative",
    width: "640px",
    height: "480px",
    margin: "0 auto",
  },
  webcam: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  canvas: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  loading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "rgba(0,0,0,0.7)",
    color: "#fff",
    padding: "15px 30px",
    borderRadius: "10px",
    fontSize: "18px",
  },
  listContainer: {
    maxWidth: "640px",
    margin: "20px auto",
    padding: "15px",
    background: "#f0f0f0",
    borderRadius: "10px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
  },
  listTitle: {
    margin: "0 0 10px",
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    fontStyle: "italic",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  listItem: {
    padding: "8px 12px",
    margin: "5px 0",
    background: "#fff",
    borderRadius: "6px",
    display: "flex",
    justifyContent: "space-between",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  objectName: {
    fontWeight: 600,
    textTransform: "capitalize",
  },
  score: {
    color: "#2e8b57",
    fontWeight: "bold",
  },
};

export default App;

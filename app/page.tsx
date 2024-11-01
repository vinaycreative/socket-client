"use client"
import React, { useEffect, useMemo, useState } from "react"
import { io } from "socket.io-client"
import axios from "axios"

const AUPHONIC_API_URL = "https://auphonic.com/api/simple/productions.json"
const API_USERNAME = ""
const API_PASSWORD = ""

const AuphonicEnhanceAudio = () => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [title, setTitle] = useState("test-track")
  const [enhancedAudioUrl, setEnhancedAudioUrl] = useState("")
  const [socketId, setSocketId] = useState<string>("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [enhanceProgress, setEnhanceProgress] = useState(0)
  const [isEnhancing, setIsEnhancing] = useState(false)

  // Memoize the socket connection
  const socket = useMemo(() => {
    const newSocket = io("https://socket-server-lcbd.onrender.com", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    return newSocket
  }, [])

  useEffect(() => {
    // Establish socket connection when the component is mounted
    socket.on("connect", () => {
      console.log("Connected to Socket.io with ID:", socket.id)
      // @ts-ignore
      setSocketId(socket.id)
    })

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err)
    })

    socket.on("reconnect", () => {
      console.log("Reconnected to Socket.io")
    })

    socket.on("reconnect_attempt", (attempt) => {
      console.log("Reconnect attempt:", attempt)
    })

    socket.on("enhanceAudioComplete", (payload) => {
      console.log("Enhancement complete, payload received:", payload)
      const audioBlob = new Blob([payload.audioFile], { type: "audio/mp3" })
      const audioUrl = URL.createObjectURL(audioBlob)
      // Use the audio URL to play or download the enhanced audio
      setEnhancedAudioUrl(audioUrl)
      setIsProcessing(false)
      setEnhanceProgress(100)
      setIsProcessing(false)
    })

    return () => {
      socket.disconnect()
    }
  }, [socket])

  // Function to trigger audio enhancement process via Auphonic API
  const handleAudioEnhancement = async () => {
    if (!audioFile || !title || !socketId) {
      console.log("Audio file, title, or socket ID is missing.")
      return
    }
    setIsProcessing(true)
    setIsEnhancing(false)
    setUploadProgress(0)

    // Build form data to send to Auphonic
    const formData = new FormData()
    formData.append("preset", "ZAoTrRzrkYUQMwAAqjm6JR")
    formData.append("title", title)
    formData.append("input_file", audioFile)
    formData.append("action", "start")
    formData.append("webhook", "https://socket-server-lcbd.onrender.com/auphonic-enhance-audio") // Replace with our actual server url
    formData.append("publisher", socketId)

    try {
      const response = await axios.post(AUPHONIC_API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        auth: {
          username: API_USERNAME,
          password: API_PASSWORD,
        },
        onUploadProgress: (progressEvent) => {
          // @ts-ignore
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100)
          console.log("Upload progress:", progress + "%")
          setUploadProgress(progress)
        },
      })

      console.log("Production created successfully:", response.data)
      setIsEnhancing(true) // Start enhancement progress simulation after upload finishes
    } catch (error) {
      console.error("Production creation failed:", error)
      setIsProcessing(false)
    }
  }

  // Simulate enhancement progress based on file size
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isEnhancing && enhanceProgress < 100) {
      const fileSizeMB = (audioFile?.size || 0) / (1024 * 1024)
      let estimatedTime = 60000
      if (fileSizeMB < 5) estimatedTime = 40000
      else if (fileSizeMB >= 5 && fileSizeMB <= 20) estimatedTime = 90000
      else estimatedTime = 120000
      const incrementTime = estimatedTime / 100
      interval = setInterval(() => {
        setEnhanceProgress((prevProgress) => Math.min(prevProgress + 1, 99))
      }, incrementTime)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isEnhancing, enhanceProgress, audioFile])

  return (
    <div className="p-10">
      <h1 className="text-2xl text-gray-800 font-semibold mb-2">Auphonic Audio Enhancement</h1>
      <div className="flex flex-col gap-3 mb-3">
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setAudioFile(e.target.files ? e.target.files[0] : null)}
        />
        <button
          onClick={handleAudioEnhancement}
          disabled={isProcessing}
          className="bg-violet-600 mr-auto px-4 py-2 text-white rounded-md"
        >
          {isProcessing ? "Processing..." : "Enhance Audio"}
        </button>
      </div>
      {isProcessing && (
        <div>
          <h2>{uploadProgress < 100 ? "Uploading..." : "Enhancing..."}</h2>
          <progress value={uploadProgress < 100 ? uploadProgress : enhanceProgress} max="100" />
          <p>
            {uploadProgress < 100
              ? `Upload Progress: ${uploadProgress}%`
              : `Enhancement Progress: ${enhanceProgress}%`}
          </p>
        </div>
      )}

      {enhancedAudioUrl && audioFile && (
        <div className="flex flex-col gap-3">
          <div className="px-4 py-2 bg-green-100 rounded-md mr-auto border border-green-300">
            <h2 className="mb-2 text-green-600">Enhanced Audio:</h2>
            <audio controls src={enhancedAudioUrl}></audio>
          </div>
          <div className="px-4 py-2 bg-pink-100 rounded-md mr-auto border border-pink-300">
            <h2 className="mb-2 text-pink-600">Unhanced Audio:</h2>
            <audio controls src={URL.createObjectURL(audioFile)}></audio>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuphonicEnhanceAudio

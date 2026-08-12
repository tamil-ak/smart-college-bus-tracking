import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsQR from 'jsqr';
import { detectAndExtractAiFaceDescriptor, getHumanInstance } from '../services/humanFaceService';
import Footer from '../components/Footer';
import '../styles/landing.css';
import '../styles/admin.css';

/**
 * Student Dashboard - Displays assignment details, vehicle info, and tracking status
 */
const StudentDashboard = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deviceRegistering, setDeviceRegistering] = useState(false);
  const [deviceMessage, setDeviceMessage] = useState('');
  const [deviceError, setDeviceError] = useState('');

  // Face Registration State
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [currentEmbedding, setCurrentEmbedding] = useState(null);
  const [faceDetecting, setFaceDetecting] = useState(false);
  const [faceRegistering, setFaceRegistering] = useState(false);
  const [faceMessage, setFaceMessage] = useState('');
  const [faceError, setFaceError] = useState('');

  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  // QR Attendance Scanner State
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [scannedQrCode, setScannedQrCode] = useState('');
  const [qrValidating, setQrValidating] = useState(false);
  const [qrValidationResult, setQrValidationResult] = useState(null);
  const [qrError, setQrError] = useState('');

  // Attendance Face Verification State
  const [faceVerifyOpen, setFaceVerifyOpen] = useState(false);
  const [faceVerifying, setFaceVerifying] = useState(false);
  const [faceVerifyResult, setFaceVerifyResult] = useState(null);
  const [faceVerifyError, setFaceVerifyError] = useState('');

  // Bus Fee & Payment State
  const [feeInfo, setFeeInfo] = useState(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState('');
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payProcessing, setPayProcessing] = useState(false);
  const [paySuccessMessage, setPaySuccessMessage] = useState('');
  const [payErrorMessage, setPayErrorMessage] = useState('');
  const [studentUtr, setStudentUtr] = useState('');

  const qrVideoRef = React.useRef(null);
  const qrCanvasRef = React.useRef(null);
  const qrAnimationRef = React.useRef(null);
  const faceVerifyVideoRef = React.useRef(null);
  const faceVerifyCanvasRef = React.useRef(null);
  const studentRef = React.useRef(student);

  useEffect(() => {
    studentRef.current = student;
  }, [student]);

  // Extract 128-dimensional normalized face embedding vector from canvas
  const extractFaceEmbedding = (canvas) => {
    try {
      const ctx = canvas.getContext('2d');
      const width = canvas.width || 640;
      const height = canvas.height || 480;

      // Extract central facial region
      const faceX = Math.floor(width * 0.2);
      const faceY = Math.floor(height * 0.15);
      const faceW = Math.floor(width * 0.6);
      const faceH = Math.floor(height * 0.7);

      const imgData = ctx.getImageData(faceX, faceY, faceW, faceH);
      const data = imgData.data;

      // 4x4 spatial blocks with 8 features each = 128 values
      const blocksX = 4;
      const blocksY = 4;
      const blockW = Math.floor(faceW / blocksX);
      const blockH = Math.floor(faceH / blocksY);

      const rawEmbedding = new Array(128).fill(0);

      for (let by = 0; by < blocksY; by++) {
        for (let bx = 0; bx < blocksX; bx++) {
          const blockIndex = (by * blocksX + bx) * 8;
          let totalLuminance = 0;
          let gradXTotal = 0;
          let gradYTotal = 0;
          let pixelCount = 0;

          for (let y = 0; y < blockH; y++) {
            for (let x = 0; x < blockW; x++) {
              const px = (by * blockH + y) * faceW + (bx * blockW + x);
              const idx = px * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              totalLuminance += lum;

              if (x > 0 && y > 0) {
                const prevX = data[idx - 4] * 0.299 + data[idx - 3] * 0.587 + data[idx - 2] * 0.114;
                const prevY = data[idx - faceW * 4] * 0.299 + data[idx - faceW * 4 + 1] * 0.587 + data[idx - faceW * 4 + 2] * 0.114;
                gradXTotal += Math.abs(lum - prevX);
                gradYTotal += Math.abs(lum - prevY);
              }
              pixelCount++;
            }
          }

          const avgLum = totalLuminance / (pixelCount || 1);
          const avgGradX = gradXTotal / (pixelCount || 1);
          const avgGradY = gradYTotal / (pixelCount || 1);

          rawEmbedding[blockIndex] = avgLum / 255;
          rawEmbedding[blockIndex + 1] = avgGradX / 128;
          rawEmbedding[blockIndex + 2] = avgGradY / 128;
          rawEmbedding[blockIndex + 3] = Math.sin(avgLum);
          rawEmbedding[blockIndex + 4] = Math.cos(avgLum);
          rawEmbedding[blockIndex + 5] = Math.sqrt(avgGradX * avgGradX + avgGradY * avgGradY) / 128;
          rawEmbedding[blockIndex + 6] = Math.atan2(avgGradY, avgGradX + 0.0001);
          rawEmbedding[blockIndex + 7] = (avgLum - 128) / 128;
        }
      }

      // L2 Normalization
      const norm = Math.sqrt(rawEmbedding.reduce((sum, val) => sum + val * val, 0)) || 1;
      return rawEmbedding.map(val => Number((val / norm).toFixed(6)));
    } catch (e) {
      console.error('Error generating face embedding:', e);
      return null;
    }
  };

  // Sign out handler
  const handleSignOut = () => {
    stopCamera();
    stopQrScanner();
    stopFaceVerification();
    localStorage.removeItem('user');
    navigate('/');
  };

  // Start Front Camera for Face Verification in Attendance
  const startFaceVerification = async () => {
    try {
      setFaceVerifyError('');
      setFaceVerifyResult(null);
      setFaceVerifyOpen(true);

      // Lazily preload Human AI models when verification camera opens
      getHumanInstance().catch(err => {
        console.warn('AI Model pre-warming notice:', err);
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (faceVerifyVideoRef.current) {
        faceVerifyVideoRef.current.srcObject = stream;
        faceVerifyVideoRef.current.setAttribute('playsinline', 'true');
        await faceVerifyVideoRef.current.play();
      }
    } catch (err) {
      console.error('Face verification camera error:', err);
      setFaceVerifyError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow front camera access for face verification.'
          : 'Unable to access front camera for face verification.'
      );
      setFaceVerifyOpen(false);
    }
  };

  // Stop Front Camera for Face Verification
  const stopFaceVerification = () => {
    if (faceVerifyVideoRef.current && faceVerifyVideoRef.current.srcObject) {
      const stream = faceVerifyVideoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      faceVerifyVideoRef.current.srcObject = null;
    }
    setFaceVerifyOpen(false);
  };

  // Configurable AI Face Matching Threshold (default: 0.60)
  const AI_FACE_MATCH_THRESHOLD = 0.60;

  // Capture current face and verify with registered aiFaceEmbedding using Human AI
  const handleCaptureAndVerifyFace = async () => {
    if (!faceVerifyVideoRef.current || !faceVerifyCanvasRef.current) return;

    const video = faceVerifyVideoRef.current;
    const canvas = faceVerifyCanvasRef.current;

    // 1. Ensure verification camera frame is captured only after video element is ready with actual video dimensions
    if (!video.videoWidth || !video.videoHeight || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setFaceVerifyError('Camera is still initializing. Please wait a moment.');
      return;
    }

    try {
      setFaceVerifying(true);
      setFaceVerifyError('');

      // 2. Set canvas dimensions strictly based on video.videoWidth and video.videoHeight (not CSS)
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      // Match face registration orientation by mirroring horizontally
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 3. Detect exactly one face and generate AI face descriptor using Human library
      const detectionResult = await detectAndExtractAiFaceDescriptor(canvas);

      if (!detectionResult.success) {
        stopFaceVerification();
        setFaceVerifyResult({
          verified: false,
          matched: false,
          message: detectionResult.error || 'Face detection failed.',
        });
        setFaceVerifying(false);
        return;
      }

      const currentDescriptor = detectionResult.descriptor;
      if (!currentDescriptor || !Array.isArray(currentDescriptor) || currentDescriptor.length === 0) {
        stopFaceVerification();
        setFaceVerifyResult({
          verified: false,
          matched: false,
          message: 'Unable to extract AI face descriptor.',
        });
        setFaceVerifying(false);
        return;
      }

      // Stop camera feed after capturing live descriptor
      stopFaceVerification();

      // 4. Retrieve registered student ID from state or cached session
      let storedUser = null;
      try {
        storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      } catch (e) {
        console.error('Error parsing stored user session:', e);
      }

      const targetStudentId = studentRef.current?._id || student?._id || storedUser?._id;

      if (!targetStudentId) {
        setFaceVerifyResult({
          verified: false,
          matched: false,
          message: 'Student session not found. Please log in again.',
        });
        setFaceVerifying(false);
        return;
      }

      // 5. Verify descriptor with backend AI face verification API
      const response = await axios.post('http://localhost:5000/api/auth/verify-ai-face', {
        studentId: targetStudentId,
        faceEmbedding: currentDescriptor,
      });

      const isMatched = Boolean(response.data?.matched || response.data?.verified);
      const similarity = response.data?.similarity;

      if (isMatched) {
        setFaceVerifyResult({
          verified: true,
          matched: true,
          similarity: similarity,
          message: 'Registered face matched',
        });
      } else {
        setFaceVerifyResult({
          verified: false,
          matched: false,
          similarity: similarity,
          message: response.data?.message || 'Face does not match the registered profile.',
        });
      }
    } catch (err) {
      console.error('Face verification error:', err);
      stopFaceVerification();
      setFaceVerifyResult({
        verified: false,
        matched: false,
        message: err.response?.data?.message || 'Face does not match the registered profile.',
      });
    } finally {
      setFaceVerifying(false);
    }
  };

  // Start QR Attendance Scanner
  const startQrScanner = async () => {
    try {
      setQrError('');
      setScannedQrCode('');
      setQrValidationResult(null);
      setQrValidating(false);
      setQrScannerOpen(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      if (qrVideoRef.current) {
        qrVideoRef.current.srcObject = stream;
        qrVideoRef.current.setAttribute('playsinline', 'true');
        await qrVideoRef.current.play();
        qrAnimationRef.current = requestAnimationFrame(scanQrFrame);
      }
    } catch (err) {
      console.error('QR camera access error:', err);
      setQrError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access to scan QR code.'
          : 'Unable to open camera for QR scanning on this device.'
      );
      setQrScannerOpen(false);
    }
  };

  // Stop QR Attendance Scanner
  const stopQrScanner = () => {
    if (qrAnimationRef.current) {
      cancelAnimationFrame(qrAnimationRef.current);
      qrAnimationRef.current = null;
    }
    if (qrVideoRef.current && qrVideoRef.current.srcObject) {
      const stream = qrVideoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      qrVideoRef.current.srcObject = null;
    }
    setQrScannerOpen(false);
  };

  // Validate Scanned QR Code with Backend & MongoDB
  const validateBusQrCode = async (rawValue) => {
    try {
      setQrValidating(true);
      let busId = null;
      let qrId = rawValue;

      try {
        const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
        if (parsed && typeof parsed === 'object') {
          busId = parsed.busId || null;
          qrId = parsed.qrId || rawValue;
        }
      } catch {
        qrId = rawValue;
      }

      const response = await axios.post('http://localhost:5000/api/bus/validate-qr', {
        busId,
        qrId,
      });

      if (response.data && response.data.valid) {
        const busNum = response.data.busNumber || response.data.bus?.busNumber;
        
        // 1. Get current device ID from existing localStorage mechanism
        const currentDeviceId = (localStorage.getItem('cbts_device_id') || '').trim();

        // 2. Get registered device ID from student state / user session / MongoDB
        let storedUser = null;
        try {
          storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        } catch (e) {
          console.error('Error parsing cached user session:', e);
        }

        let registeredDeviceId = (
          studentRef.current?.registeredDeviceId ||
          student?.registeredDeviceId ||
          storedUser?.registeredDeviceId ||
          ''
        ).trim();

        // If not found in local memory, query live MongoDB profile to ensure fresh data
        const targetStudentId = studentRef.current?._id || student?._id || storedUser?._id;
        if (!registeredDeviceId && targetStudentId) {
          try {
            const profileRes = await axios.get(`http://localhost:5000/api/auth/profile/${targetStudentId}`);
            if (profileRes.data?.user?.registeredDeviceId) {
              registeredDeviceId = (profileRes.data.user.registeredDeviceId || '').trim();
            }
          } catch (e) {
            console.error('Live profile lookup error for device verification:', e);
          }
        }

        // 3. Compare current device ID with student's registeredDeviceId
        const isDeviceMatch = Boolean(
          registeredDeviceId &&
          currentDeviceId &&
          registeredDeviceId === currentDeviceId
        );

        // Required debug logs
        console.log('currentDeviceId:', currentDeviceId);
        console.log('registeredDeviceId:', registeredDeviceId);
        console.log('whether they match:', isDeviceMatch);

        setQrValidationResult({
          valid: true,
          message: `Valid Bus QR – Bus ${busNum}`,
          busNumber: busNum,
          bus: response.data.bus,
          deviceVerified: isDeviceMatch,
        });
      } else {
        setQrValidationResult({
          valid: false,
          message: 'Invalid Bus QR',
        });
      }
    } catch (err) {
      console.error('Bus QR validation error:', err);
      setQrValidationResult({
        valid: false,
        message: 'Invalid Bus QR',
      });
    } finally {
      setQrValidating(false);
    }
  };

  // Scan live video frame for QR codes
  const scanQrFrame = async () => {
    if (!qrVideoRef.current || !qrCanvasRef.current) return;
    const video = qrVideoRef.current;
    const canvas = qrCanvasRef.current;

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
      // 1. Check Hardware-accelerated BarcodeDetector if supported
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await barcodeDetector.detect(video);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            const detectedVal = barcodes[0].rawValue;
            setScannedQrCode(detectedVal);
            if (qrAnimationRef.current) {
              cancelAnimationFrame(qrAnimationRef.current);
              qrAnimationRef.current = null;
            }
            if (video.srcObject) {
              video.srcObject.getTracks().forEach(track => track.stop());
              video.srcObject = null;
            }
            validateBusQrCode(detectedVal);
            return;
          }
        } catch {
          // Fall back to jsQR
        }
      }

      // 2. Pure JS jsQR frame decoding
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          const detectedVal = code.data;
          setScannedQrCode(detectedVal);
          if (qrAnimationRef.current) {
            cancelAnimationFrame(qrAnimationRef.current);
            qrAnimationRef.current = null;
          }
          if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
          }
          validateBusQrCode(detectedVal);
          return;
        }
      } catch (e) {
        console.error('QR decode frame error:', e);
      }
    }

    qrAnimationRef.current = requestAnimationFrame(scanQrFrame);
  };

  // Start Front Camera for Face Capture
  const startCamera = async () => {
    try {
      setFaceError('');
      setFaceMessage('');
      setCapturedImage(null);
      setCurrentEmbedding(null);
      setFaceModalOpen(true);

      // Lazily preload Human AI models when camera starts
      getHumanInstance().catch(err => {
        console.warn('AI Model pre-warming notice:', err);
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error('Video play error:', e));
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setFaceError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : 'Unable to access front camera on this device.'
      );
      setFaceModalOpen(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setFaceModalOpen(false);
  };

  // Capture face frame from live video and compute AI face descriptor using Human
  const handleCaptureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video.videoWidth || !video.videoHeight || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setFaceError('Camera is initializing. Please wait a moment.');
      return;
    }

    try {
      setFaceDetecting(true);
      setFaceError('');

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      // Mirror image horizontally to match selfie preview
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detect exactly one face and extract exact AI descriptor via Human library
      const detectionResult = await detectAndExtractAiFaceDescriptor(canvas);

      if (!detectionResult.success) {
        setFaceError(detectionResult.error || 'Face detection failed. Please try again.');
        return;
      }

      const descriptor = detectionResult.descriptor;
      if (!descriptor || descriptor.length === 0) {
        setFaceError('Could not process face features. Please retake the capture.');
        return;
      }

      setCurrentEmbedding(descriptor);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);

      // Stop camera stream once frame is captured
      if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }
    } catch (err) {
      console.error('Face capture error:', err);
      setFaceError(err.message || 'Failed to analyze face. Please try again.');
    } finally {
      setFaceDetecting(false);
    }
  };

  // Retake face photo
  const handleRetakeFace = () => {
    setCapturedImage(null);
    setCurrentEmbedding(null);
    startCamera();
  };

  // Confirm and register face with generated AI embedding
  const handleConfirmRegisterFace = async () => {
    if (!student?._id) return;
    if (!currentEmbedding || !Array.isArray(currentEmbedding) || currentEmbedding.length === 0) {
      setFaceError('AI Face embedding not generated. Please capture your face again.');
      return;
    }

    try {
      setFaceRegistering(true);
      setFaceError('');

      const response = await axios.post('http://localhost:5000/api/auth/register-ai-face', {
        studentId: student._id,
        aiFaceEmbedding: currentEmbedding,
      });

      if (response.data && response.data.success) {
        setFaceMessage('AI Face Registered ✓');
        const updatedStudent = {
          ...student,
          isAiFaceRegistered: true,
          aiFaceEmbedding: currentEmbedding,
        };
        setStudent(updatedStudent);

        // Keep localStorage session updated
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.isAiFaceRegistered = true;
            parsed.aiFaceEmbedding = currentEmbedding;
            localStorage.setItem('user', JSON.stringify(parsed));
          } catch (e) {
            console.error('Error updating localStorage user', e);
          }
        }

        stopCamera();
        setCapturedImage(null);
        setCurrentEmbedding(null);
      }
    } catch (err) {
      console.error('Error registering AI face:', err);
      setFaceError(err.response?.data?.message || 'Failed to register AI face. Please try again.');
    } finally {
      setFaceRegistering(false);
    }
  };

  // Clean up cameras and animation frames on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      if (qrAnimationRef.current) {
        cancelAnimationFrame(qrAnimationRef.current);
      }
      if (qrVideoRef.current && qrVideoRef.current.srcObject) {
        qrVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      if (faceVerifyVideoRef.current && faceVerifyVideoRef.current.srcObject) {
        faceVerifyVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Register device handler
  const handleRegisterDevice = async () => {
    try {
      setDeviceRegistering(true);
      setDeviceError('');
      setDeviceMessage('');

      // Generate or retrieve unique device ID for this client/browser
      let deviceId = localStorage.getItem('cbts_device_id');
      if (!deviceId) {
        deviceId = 'DEV-' + (window.crypto?.randomUUID ? window.crypto.randomUUID() : (Math.random().toString(36).substring(2, 10) + Date.now().toString(36)).toUpperCase());
        localStorage.setItem('cbts_device_id', deviceId);
      }

      const response = await axios.post('http://localhost:5000/api/auth/register-device', {
        studentId: student._id,
        deviceId: deviceId,
      });

      if (response.data && response.data.success) {
        setDeviceMessage(response.data.message || 'Device registered successfully.');
        const updatedStudent = {
          ...student,
          registeredDeviceId: deviceId,
        };
        setStudent(updatedStudent);

        // Keep localStorage user session updated
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.registeredDeviceId = deviceId;
            localStorage.setItem('user', JSON.stringify(parsed));
          } catch (e) {
            console.error('Error updating localStorage user', e);
          }
        }
      }
    } catch (err) {
      console.error('Error registering device:', err);
      setDeviceError(err.response?.data?.message || 'Failed to register device. Please try again.');
    } finally {
      setDeviceRegistering(false);
    }
  };

  // Fetch Student Transport Fee and Live Payment Status from MongoDB
  const fetchStudentFee = async (studentId) => {
    if (!studentId) return;
    try {
      setFeeLoading(true);
      setFeeError('');
      const response = await axios.get(`http://localhost:5000/api/fee/student-fee/${studentId}`);
      if (response.data && response.data.success) {
        setFeeInfo(response.data);
      }
    } catch (err) {
      console.error('Error loading student fee information:', err);
      setFeeError(err.response?.data?.message || 'Failed to load transport fee status.');
    } finally {
      setFeeLoading(false);
    }
  };

  // Submit UPI Payment with Transaction ID / UTR for Admin Verification
  const handleProcessPayment = async () => {
    if (!feeInfo || !feeInfo.fee || !student?._id) return;

    if (!studentUtr || !studentUtr.trim()) {
      setPayErrorMessage('Please enter the UPI Transaction ID / UTR from your UPI payment app.');
      return;
    }

    try {
      setPayProcessing(true);
      setPayErrorMessage('');
      setPaySuccessMessage('');

      const payload = {
        studentId: student._id,
        busId: feeInfo.bus?._id || (typeof student.busId === 'object' ? student.busId._id : student.busId),
        feeId: feeInfo.fee._id,
        academicYear: feeInfo.fee.academicYear || '2026-2027',
        amount: feeInfo.fee.amount,
        transactionId: studentUtr.trim(),
        paymentMethod: 'UPI Transfer',
      };

      const response = await axios.post('http://localhost:5000/api/fee/submit-payment', payload);

      if (response.data && response.data.success) {
        setPaySuccessMessage(response.data.message || 'Payment submitted successfully for verification!');
        // Refresh fee record directly from MongoDB to reflect updated Pending Verification state
        await fetchStudentFee(student._id);
        setTimeout(() => {
          setPayModalOpen(false);
          setPaySuccessMessage('');
          setStudentUtr('');
        }, 1800);
      }
    } catch (err) {
      console.error('Error submitting fee payment:', err);
      setPayErrorMessage(err.response?.data?.message || 'Payment submission failed. Please try again.');
    } finally {
      setPayProcessing(false);
    }
  };

  // Format currency
  const formatFeeCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Format date
  const formatFeeDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format time (e.g. 10:42 AM)
  const formatFeeTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format timestamp with time
  const formatFeeDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Fetch student profile including populated bus assignment details
  useEffect(() => {
    const fetchStudentProfile = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          setError('No user session found. Please sign in again.');
          setLoading(false);
          return;
        }

        let parsedUser;
        try {
          parsedUser = JSON.parse(storedUser);
        } catch {
          setError('Invalid session data. Please sign in again.');
          setLoading(false);
          return;
        }

        if (!parsedUser || !parsedUser._id) {
          setError('User session expired. Please sign in again.');
          setLoading(false);
          return;
        }

        // Set student state immediately from cached session for instant, non-blank render
        setStudent(parsedUser);

        // Fetch fee status
        fetchStudentFee(parsedUser._id);

        const response = await axios.get(`http://localhost:5000/api/auth/profile/${parsedUser._id}`);

        if (response.data && response.data.user) {
          setStudent(response.data.user);
          // Keep localStorage synced
          localStorage.setItem('user', JSON.stringify(response.data.user));
          // Refresh fee status with latest student data
          fetchStudentFee(response.data.user._id);
        }
      } catch (err) {
        console.error('Error loading student profile:', err);
        if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else if (err.code === 'ERR_NETWORK' || !err.response) {
          setError('Cannot connect to backend server. Make sure the backend is running on http://localhost:5000.');
        } else {
          setError('Failed to refresh latest details from server.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStudentProfile();
  }, []);

  return (
    <div className="cbts-admin-wrapper">
      {/* Background Blobs */}
      <div className="cbts-bg-blobs" aria-hidden="true">
        <div className="cbts-blob cbts-blob-1"></div>
        <div className="cbts-blob cbts-blob-2"></div>
        <div className="cbts-blob cbts-blob-3"></div>
      </div>

      <main className="cbts-student-content">
        {/* Header */}
        <header className="cbts-student-header">
          <div className="cbts-student-title-group">
            <h1 className="cbts-student-title">Student Portal</h1>
            <p className="cbts-student-subtitle">Welcome back, {student?.name || 'Student'}!</p>
          </div>

          <button className="cbts-admin-btn-exit" onClick={handleSignOut}>
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </header>

        {error && (
          <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1.5rem' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="cbts-student-card" style={{ padding: '3rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
            <div className="cbts-loader-container" style={{ padding: '2rem 0' }}>
              <div className="cbts-loader-spinner" style={{ width: '38px', height: '38px' }}></div>
              <p className="cbts-loader-text">Fetching account information...</p>
            </div>
          </div>
        ) : !student ? (
          <div className="cbts-student-card" style={{ padding: '3rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 className="cbts-student-card-title" style={{ marginBottom: '0.75rem' }}>No Active Session</h3>
            <p style={{ color: 'var(--text-dark-secondary)', marginBottom: '1.5rem', maxWidth: '400px' }}>
              Please sign in with your student credentials to access your dashboard.
            </p>
            <button
              type="button"
              className="cbts-btn cbts-btn-primary"
              onClick={() => navigate('/login/student')}
              style={{ minWidth: '180px' }}
            >
              Sign In
            </button>
          </div>
        ) : (
          <div className="cbts-student-cards-stack">
            
            {/* Bus Attendance Section */}
            <div className="cbts-student-card">
              <div className="cbts-device-security-header">
                <h2 className="cbts-student-card-title" style={{ margin: 0 }}>
                  Bus Boarding Attendance
                </h2>
                <div>
                  <span className="cbts-device-badge" style={{ background: 'rgba(11, 61, 145, 0.08)', color: 'var(--primary-navy)', border: '1px solid rgba(11, 61, 145, 0.15)' }}>
                    Bus Attendance
                  </span>
                </div>
              </div>

              {qrError && (
                <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1rem' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{qrError}</span>
                </div>
              )}

              {/* Hidden canvas for QR frame decoding */}
              <canvas ref={qrCanvasRef} style={{ display: 'none' }} />

              {/* Hidden canvas for Face Verification descriptor extraction */}
              <canvas ref={faceVerifyCanvasRef} style={{ display: 'none' }} />

              {!qrScannerOpen && !scannedQrCode && !faceVerifyOpen ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <p style={{ margin: 0, color: 'var(--text-dark-secondary)', fontSize: '0.9rem', lineHeight: '1.45' }}>
                    Scan the QR code inside your assigned bus to mark attendance.
                  </p>
                  <div>
                    <button
                      type="button"
                      className="cbts-btn cbts-btn-primary cbts-btn-register-device"
                      onClick={startQrScanner}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                      Scan QR for Attendance
                    </button>
                  </div>
                </div>
              ) : qrScannerOpen && !scannedQrCode ? (
                <div className="cbts-qr-scanner-card">
                  <div className="cbts-qr-viewport">
                    <video ref={qrVideoRef} className="cbts-qr-video" autoPlay playsInline muted />
                    <div className="cbts-qr-overlay">
                      <div className="cbts-qr-corner cbts-qr-corner-tl" />
                      <div className="cbts-qr-corner cbts-qr-corner-tr" />
                      <div className="cbts-qr-corner cbts-qr-corner-bl" />
                      <div className="cbts-qr-corner cbts-qr-corner-br" />
                      <div className="cbts-qr-laser-line" />
                    </div>
                  </div>

                  <p className="cbts-qr-hint">
                    Scan the QR code placed inside your assigned bus.
                  </p>

                  <div className="cbts-camera-actions">
                    <button
                      type="button"
                      className="cbts-btn cbts-btn-secondary"
                      onClick={stopQrScanner}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : faceVerifyOpen ? (
                <div className="cbts-qr-scanner-card">
                  {faceVerifyError && (
                    <div className="cbts-form-alert" role="alert" style={{ marginBottom: '0.85rem' }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{faceVerifyError}</span>
                    </div>
                  )}

                  <div className="cbts-camera-container">
                    <video ref={faceVerifyVideoRef} className="cbts-camera-video" autoPlay playsInline muted />
                    <div className="cbts-face-oval-guide" />
                  </div>

                  <p className="cbts-qr-hint" style={{ marginTop: '0.75rem' }}>
                    Look directly into the camera to verify your face.
                  </p>

                  <div className="cbts-camera-actions">
                    <button
                      type="button"
                      className="cbts-btn cbts-btn-primary"
                      onClick={handleCaptureAndVerifyFace}
                      disabled={faceVerifying}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                        <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                        <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
                      </svg>
                      {faceVerifying ? 'Verifying...' : 'Verify Face'}
                    </button>
                    <button
                      type="button"
                      className="cbts-btn cbts-btn-secondary"
                      onClick={stopFaceVerification}
                      disabled={faceVerifying}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="cbts-qr-scanner-card">
                  {qrValidating ? (
                    <div className="cbts-qr-scanned-box" style={{ background: 'rgba(11, 61, 145, 0.05)', borderColor: 'rgba(11, 61, 145, 0.15)', color: 'var(--primary-navy)' }}>
                      <div className="cbts-loader-spinner" style={{ width: '22px', height: '22px', margin: '0 auto 0.4rem' }} />
                      <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600 }}>Verifying Bus QR with database...</p>
                    </div>
                  ) : qrValidationResult?.valid ? (
                    <div className="cbts-qr-scanned-box" style={{ background: qrValidationResult.deviceVerified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.08)', borderColor: qrValidationResult.deviceVerified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)', color: 'var(--text-dark-primary)' }}>
                      {/* 1. Bus QR Confirmation */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '1.05rem', color: '#065F46', marginBottom: '0.2rem' }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {qrValidationResult.message}
                      </div>

                      {/* 2. Registered Device Verification Status */}
                      {qrValidationResult.deviceVerified ? (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(16, 185, 129, 0.25)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.98rem', color: '#065F46', marginBottom: '0.15rem' }}>
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            ✓ Device Verified
                          </div>
                          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-dark-secondary)' }}>
                            Registered device confirmed
                          </p>
                        </div>
                      ) : (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(239, 68, 68, 0.25)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.98rem', color: '#991B1B', marginBottom: '0.15rem' }}>
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            ✕ Device Verification Failed
                          </div>
                          <p style={{ margin: 0, fontSize: '0.84rem', color: '#991B1B' }}>
                            This device is not registered for this student.
                          </p>
                        </div>
                      )}

                      {/* 3. AI Face Verification Status */}
                      {faceVerifying ? (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(11, 61, 145, 0.15)', textAlign: 'center' }}>
                          <div className="cbts-loader-spinner" style={{ width: '20px', height: '20px', margin: '0 auto 0.35rem' }} />
                          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--primary-navy)', fontWeight: 600 }}>Analyzing face and comparing AI descriptor...</p>
                        </div>
                      ) : faceVerifyResult ? (
                        faceVerifyResult.verified || faceVerifyResult.matched ? (
                          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(16, 185, 129, 0.25)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.98rem', color: '#065F46', marginBottom: '0.15rem' }}>
                              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              ✓ AI Face Verified
                            </div>
                            {faceVerifyResult.similarity !== undefined && (
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#065F46', margin: '0.15rem 0' }}>
                                Face Similarity: {Number(faceVerifyResult.similarity).toFixed(2)}
                              </div>
                            )}
                            <p style={{ margin: '0 0 0.5rem', fontSize: '0.84rem', color: 'var(--text-dark-secondary)' }}>
                              Registered face matched
                            </p>

                            {/* Attendance Verified Confirmation */}
                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.98rem', color: '#065F46' }}>
                              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              ✓ Attendance Verified
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(239, 68, 68, 0.25)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.98rem', color: '#991B1B', marginBottom: '0.15rem' }}>
                              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                              ✕ AI Face Verification Failed
                            </div>
                            {faceVerifyResult.similarity !== undefined && (
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#991B1B', margin: '0.15rem 0' }}>
                                Face Similarity: {Number(faceVerifyResult.similarity).toFixed(2)}
                              </div>
                            )}
                            <p style={{ margin: 0, fontSize: '0.84rem', color: '#991B1B', marginBottom: '0.6rem' }}>
                              {faceVerifyResult.message || 'Face does not match the registered profile.'}
                            </p>
                            <button
                              type="button"
                              className="cbts-btn cbts-btn-primary"
                              onClick={startFaceVerification}
                              style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              Retry Face Verification
                            </button>
                          </div>
                        )
                      ) : qrValidationResult.deviceVerified ? (
                        <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(16, 185, 129, 0.25)' }}>
                          <button
                            type="button"
                            className="cbts-btn cbts-btn-primary"
                            onClick={startFaceVerification}
                            style={{ width: '100%', padding: '0.65rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                              <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                              <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
                            </svg>
                            Proceed to Face Verification
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="cbts-qr-scanned-box" style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.25)', color: '#991B1B' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.2rem' }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        Invalid Bus QR
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.85 }}>
                        This QR code does not match any registered bus
                      </p>
                    </div>
                  )}

                  <div className="cbts-camera-actions">
                    <button
                      type="button"
                      className="cbts-btn cbts-btn-primary"
                      onClick={() => {
                        setScannedQrCode('');
                        setQrValidationResult(null);
                        setFaceVerifyResult(null);
                        stopFaceVerification();
                        startQrScanner();
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 4v6h6" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                      Scan Again
                    </button>
                    <button
                      type="button"
                      className="cbts-btn cbts-btn-secondary"
                      onClick={() => {
                        setScannedQrCode('');
                        setQrValidationResult(null);
                        setFaceVerifyResult(null);
                        stopFaceVerification();
                        setQrScannerOpen(false);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Student Registration Details */}
            <div className="cbts-student-card">
              <h2 className="cbts-student-card-title">
                Account Information
              </h2>
              
              <div className="cbts-student-info-grid">
                <div className="cbts-info-item">
                  <span className="cbts-info-label">Register Number</span>
                  <p className="cbts-info-value">{student?.registerNumber}</p>
                </div>
                <div className="cbts-info-item">
                  <span className="cbts-info-label">Department & Class</span>
                  <p className="cbts-info-value">{student?.department} - {student?.year} Yr ({student?.section})</p>
                </div>
                <div className="cbts-info-item">
                  <span className="cbts-info-label">Email Address</span>
                  <p className="cbts-info-value">{student?.email}</p>
                </div>
                <div className="cbts-info-item">
                  <span className="cbts-info-label">Status</span>
                  <div style={{ marginTop: '0.2rem' }}>
                    <span 
                      className="cbts-badge-pending"
                      style={{ 
                        background: student?.status === 'Assigned' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: student?.status === 'Assigned' ? '#065F46' : '#B78103'
                      }}
                    >
                      {student?.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Device Security Section */}
            <div className="cbts-student-card">
              <div className="cbts-device-security-header">
                <h2 className="cbts-student-card-title" style={{ margin: 0 }}>
                  Device Security
                </h2>
                <div>
                  {student?.registeredDeviceId ? (
                    <span className="cbts-device-badge cbts-device-badge-registered">
                      Status: Device Registered ✓
                    </span>
                  ) : (
                    <span className="cbts-device-badge cbts-device-badge-unregistered">
                      Status: Device Not Registered
                    </span>
                  )}
                </div>
              </div>

              {deviceMessage && (
                <div className="cbts-device-message-alert">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{deviceMessage}</span>
                </div>
              )}

              {deviceError && (
                <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1rem' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{deviceError}</span>
                </div>
              )}

              {!student?.registeredDeviceId ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <p style={{ margin: 0, color: 'var(--text-dark-secondary)', fontSize: '0.9rem', lineHeight: '1.45' }}>
                    Your account is not yet bound to a registered device. Register this browser/device to secure your student portal.
                  </p>
                  <div>
                    <button
                      type="button"
                      className="cbts-btn cbts-btn-primary cbts-btn-register-device"
                      onClick={handleRegisterDevice}
                      disabled={deviceRegistering}
                    >
                      {deviceRegistering ? 'Registering Device...' : 'Register This Device'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <p style={{ margin: 0, color: 'var(--text-dark-secondary)', fontSize: '0.9rem' }}>
                    This browser/device is registered and linked to your student account.
                  </p>
                  <div className="cbts-device-id-box">
                    <span className="cbts-info-label">Registered Device ID</span>
                    <p className="cbts-device-id-value">
                      {student.registeredDeviceId}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Face Registration Section */}
            <div className="cbts-student-card">
              <div className="cbts-device-security-header">
                <h2 className="cbts-student-card-title" style={{ margin: 0 }}>
                  Face Registration
                </h2>
                <div>
                  {student?.isAiFaceRegistered ? (
                    <span className="cbts-device-badge cbts-device-badge-registered">
                      Status: AI Face Registered ✓
                    </span>
                  ) : student?.isFaceRegistered ? (
                    <span className="cbts-device-badge cbts-device-badge-registered">
                      Status: Face Registered ✓
                    </span>
                  ) : (
                    <span className="cbts-device-badge cbts-device-badge-unregistered">
                      Status: Face Not Registered
                    </span>
                  )}
                </div>
              </div>

              {faceMessage && (
                <div className="cbts-device-message-alert">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{faceMessage}</span>
                </div>
              )}

              {faceError && (
                <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1rem' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{faceError}</span>
                </div>
              )}

              {/* Hidden canvas for snapshotting */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {(student?.isAiFaceRegistered || student?.isFaceRegistered) && !faceModalOpen ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <p style={{ margin: 0, color: 'var(--text-dark-secondary)', fontSize: '0.9rem' }}>
                    {student?.isAiFaceRegistered
                      ? 'Your AI face descriptor is registered for automated student verification.'
                      : 'Your face profile is registered for secure bus boarding.'}
                  </p>
                  <div>
                    <button
                      type="button"
                      className="cbts-btn cbts-btn-secondary"
                      onClick={startCamera}
                      style={{
                        padding: '0.5rem 1.15rem',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        borderRadius: '9999px',
                        border: '1.5px solid var(--primary-navy)',
                        color: 'var(--primary-navy)',
                        background: 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      {student?.isAiFaceRegistered ? 'Re-register AI Face' : 'Upgrade to AI Face Registration'}
                    </button>
                  </div>
                </div>
              ) : !faceModalOpen ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <p style={{ margin: 0, color: 'var(--text-dark-secondary)', fontSize: '0.9rem', lineHeight: '1.45' }}>
                    Register your facial profile using the front camera to prepare your account for automated student verification.
                  </p>
                  <div>
                    <button
                      type="button"
                      className="cbts-btn cbts-btn-primary cbts-btn-register-device"
                      onClick={startCamera}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      Register Face
                    </button>
                  </div>
                </div>
              ) : (
                <div className="cbts-camera-card-body">
                  <div className="cbts-camera-wrapper">
                    {!capturedImage ? (
                      <>
                        <video ref={videoRef} autoPlay playsInline muted className="cbts-camera-video" />
                        <div className="cbts-face-oval-guide" />
                      </>
                    ) : (
                      <>
                        <img src={capturedImage} alt="Captured Face Preview" className="cbts-camera-canvas" />
                        <div className="cbts-face-captured-badge">
                          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Face Captured & Validated
                        </div>
                      </>
                    )}
                  </div>

                  <div className="cbts-camera-actions">
                    {!capturedImage ? (
                      <>
                        <button
                          type="button"
                          className="cbts-btn cbts-btn-primary"
                          onClick={handleCaptureFace}
                          disabled={faceDetecting}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="4" />
                          </svg>
                          {faceDetecting ? 'Detecting Face...' : 'Capture Face'}
                        </button>
                        <button
                          type="button"
                          className="cbts-btn cbts-btn-secondary"
                          onClick={stopCamera}
                          disabled={faceDetecting}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="cbts-btn cbts-btn-primary"
                          onClick={handleConfirmRegisterFace}
                          disabled={faceRegistering}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {faceRegistering ? 'Registering...' : 'Register Face'}
                        </button>
                        <button
                          type="button"
                          className="cbts-btn cbts-btn-secondary"
                          onClick={handleRetakeFace}
                          disabled={faceRegistering}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 4v6h6" />
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                          </svg>
                          Retake
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bus Assignment Details Card */}
            <div className="cbts-student-card">
              <h2 className="cbts-student-card-title">
                Bus Assignment Details
              </h2>

              {!student?.busId || typeof student.busId !== 'object' ? (
                <div className="cbts-empty-state" style={{ padding: '2rem 1rem' }}>
                  <div className="cbts-empty-icon-container" style={{ width: '56px', height: '56px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="cbts-empty-icon" style={{ width: '26px', height: '26px' }}>
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <line x1="6" y1="8" x2="10" y2="8" />
                      <line x1="6" y1="12" x2="18" y2="12" />
                    </svg>
                  </div>
                  <h3 className="cbts-empty-title" style={{ fontSize: '1.15rem', marginTop: '0.75rem' }}>No Bus Assigned Yet</h3>
                  <p className="cbts-empty-subtitle" style={{ fontSize: '0.85rem' }}>The transport administrator has not allocated a bus to your route yet. Please check back later.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Bus Grid Details */}
                  <div className="cbts-student-info-grid">
                    <div className="cbts-info-item">
                      <span className="cbts-info-label">Assigned Bus</span>
                      <p className="cbts-info-value" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                        {student.busId.busNumber || 'N/A'}
                      </p>
                    </div>
                    <div className="cbts-info-item">
                      <span className="cbts-info-label">Route Details</span>
                      <p className="cbts-info-value">
                        {student.busId.route || 'N/A'}
                      </p>
                    </div>
                    <div className="cbts-info-item">
                      <span className="cbts-info-label">Driver Name</span>
                      <p className="cbts-info-value">
                        {student.busId.driverName || 'N/A'}
                      </p>
                    </div>
                    <div className="cbts-info-item">
                      <span className="cbts-info-label">Driver Contact</span>
                      <p className="cbts-info-value" style={{ color: 'var(--primary-navy)' }}>
                        {student.busId.driverPhone || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Seat Metrics Row */}
                  <div className="cbts-bus-seats-row">
                    <div className="cbts-bus-seat-metric" style={{ background: 'rgba(11, 61, 145, 0.03)', borderColor: 'rgba(11, 61, 145, 0.05)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Bus Seats</span>
                      <p style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0.15rem 0 0', color: 'var(--primary-navy)' }}>{student.busId.totalSeats ?? 0}</p>
                    </div>
                    <div className="cbts-bus-seat-metric" style={{ background: 'rgba(16, 185, 129, 0.04)', borderColor: 'rgba(16, 185, 129, 0.05)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available Seats</span>
                      <p style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0.15rem 0 0', color: '#10B981' }}>{student.busId.availableSeats ?? 0}</p>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Bus Transport Fee & Payment Card */}
            <div className="cbts-student-card">
              <div className="cbts-device-security-header">
                <h2 className="cbts-student-card-title" style={{ margin: 0 }}>
                  Bus Transport Fee & Payment
                </h2>
                <div>
                  {!student?.busId || typeof student.busId !== 'object' ? (
                    <span className="cbts-device-badge" style={{ background: 'rgba(107, 114, 128, 0.12)', color: '#4B5563', border: '1px solid rgba(107, 114, 128, 0.25)', fontWeight: 600 }}>
                      No Bus Assigned
                    </span>
                  ) : feeLoading ? (
                    <span className="cbts-device-badge" style={{ background: 'rgba(11, 61, 145, 0.08)', color: 'var(--primary-navy)', border: '1px solid rgba(11, 61, 145, 0.15)', fontWeight: 600 }}>
                      Checking Fee Status...
                    </span>
                  ) : feeInfo?.payment?.status === 'Paid' ? (
                    <span className="cbts-device-badge cbts-device-badge-registered" style={{ fontWeight: 800, fontSize: '0.86rem', background: '#ECFDF5', color: '#065F46', border: '1.5px solid #10B981' }}>
                      ● Bus Fee Paid ✓
                    </span>
                  ) : (
                    <span className="cbts-device-badge" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#B45309', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 700 }}>
                      Fee Status: Unpaid
                    </span>
                  )}
                </div>
              </div>

              {feeError && (
                <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1rem' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{feeError}</span>
                </div>
              )}

              {!student?.busId || typeof student.busId !== 'object' ? (
                <div className="cbts-empty-state" style={{ padding: '1.75rem 1rem' }}>
                  <p style={{ margin: 0, color: 'var(--text-dark-secondary)', fontSize: '0.9rem' }}>
                    Transport fee schedule will be calculated and presented here once your bus allocation is confirmed by the transport administrator.
                  </p>
                </div>
              ) : feeLoading ? (
                <div className="cbts-loader-container" style={{ padding: '1.5rem 0' }}>
                  <div className="cbts-loader-spinner" style={{ width: '28px', height: '28px' }}></div>
                  <p className="cbts-loader-text" style={{ fontSize: '0.85rem' }}>Loading fee schedule from database...</p>
                </div>
              ) : !feeInfo?.hasFeeConfigured || !feeInfo?.fee ? (
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '12px', padding: '1.15rem 1.25rem' }}>
                  <p style={{ margin: 0, color: '#92400E', fontSize: '0.92rem', fontWeight: 600 }}>
                    Fee schedule for Bus {student.busId.busNumber} has not been published yet by the college transport department.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Fee Details Grid */}
                  <div className="cbts-student-info-grid">
                    <div className="cbts-info-item">
                      <span className="cbts-info-label">Assigned Bus</span>
                      <p className="cbts-info-value" style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>
                        Bus {feeInfo.bus?.busNumber || student.busId.busNumber}
                      </p>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)' }}>
                        {feeInfo.bus?.route || student.busId.route}
                      </span>
                    </div>

                    <div className="cbts-info-item">
                      <span className="cbts-info-label">Academic Year</span>
                      <p className="cbts-info-value" style={{ fontWeight: 700 }}>
                        {feeInfo.fee.academicYear}
                      </p>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)' }}>
                        Applies to all student years
                      </span>
                    </div>

                    <div className="cbts-info-item">
                      <span className="cbts-info-label">Bus Fee Amount</span>
                      <p className="cbts-info-value" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#065F46' }}>
                        {formatFeeCurrency(feeInfo.fee.amount)}
                      </p>
                    </div>

                    <div className="cbts-info-item">
                      <span className="cbts-info-label">Payment Due Date</span>
                      <p className="cbts-info-value" style={{ fontWeight: 600 }}>
                        {formatFeeDate(feeInfo.fee.dueDate)}
                      </p>
                    </div>
                  </div>

                  {/* Payment Status Action / Receipt Section */}
                  {feeInfo.payment?.status === 'Paid' ? (
                    <div
                      style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1.5px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: '16px',
                        padding: '1.25rem 1.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
                        <div
                          style={{
                            background: '#10B981',
                            color: '#ffffff',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                          }}
                        >
                          ✓
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#065F46' }}>
                          Bus Fee Paid ✓
                        </h4>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', fontSize: '0.86rem' }}>
                        <div>
                          <span style={{ color: '#047857', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Amount Paid</span>
                          <p style={{ margin: '0.15rem 0 0', fontWeight: 800, fontSize: '1.1rem', color: '#065F46' }}>
                            {formatFeeCurrency(feeInfo.payment.amount)}
                          </p>
                        </div>
                        <div>
                          <span style={{ color: '#047857', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Transaction ID / UTR</span>
                          <p style={{ margin: '0.15rem 0 0', fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary-navy)' }}>
                            {feeInfo.payment.transactionId || 'TXN-CONFIRMED'}
                          </p>
                        </div>
                        <div>
                          <span style={{ color: '#047857', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Paid Date</span>
                          <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: 'var(--text-dark-primary)' }}>
                            {formatFeeDate(feeInfo.payment.paidAt)}
                          </p>
                        </div>
                        <div>
                          <span style={{ color: '#047857', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Paid Time</span>
                          <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: 'var(--text-dark-primary)' }}>
                            {formatFeeTime(feeInfo.payment.paidAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: 'rgba(11, 61, 145, 0.04)',
                        border: '1px solid rgba(11, 61, 145, 0.15)',
                        borderRadius: '16px',
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, color: 'var(--primary-navy)', fontSize: '0.95rem' }}>
                            Annual Transport Fee Payment Due
                          </p>
                          <p style={{ margin: '0.2rem 0 0', color: 'var(--text-dark-secondary)', fontSize: '0.84rem' }}>
                            Please settle your transport fee of <strong>{formatFeeCurrency(feeInfo.fee.amount)}</strong> before {formatFeeDate(feeInfo.fee.dueDate)}.
                          </p>
                        </div>

                        <button
                          type="button"
                          className="cbts-btn cbts-btn-primary"
                          onClick={() => {
                            setPayErrorMessage('');
                            setPaySuccessMessage('');
                            setStudentUtr('');
                            setPayModalOpen(true);
                          }}
                          style={{
                            padding: '0.7rem 1.6rem',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 14px rgba(11, 61, 145, 0.25)',
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                          </svg>
                          Pay Bus Fee ({formatFeeCurrency(feeInfo.fee.amount)})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Student UPI QR Direct Payment Checkout Modal */}
      {payModalOpen && feeInfo?.fee && (
        <div
          className="cbts-qr-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 15, 36, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
          }}
          onClick={() => {
            if (!payProcessing) setPayModalOpen(false);
          }}
        >
          <div
            className="cbts-hero-card"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '2.25rem',
              borderRadius: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              animation: 'fadeInUp 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                  Bus Transport Fee Checkout
                </h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.84rem', color: 'var(--text-dark-secondary)' }}>
                  Academic Year {feeInfo.fee.academicYear} • Bus {feeInfo.bus?.busNumber || student?.busId?.busNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                disabled={payProcessing}
                style={{
                  background: 'rgba(0,0,0,0.05)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-dark-muted)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Error / Success Banners */}
            {payErrorMessage && (
              <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1rem' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                </svg>
                <span>{payErrorMessage}</span>
              </div>
            )}

            {paySuccessMessage && (
              <div className="cbts-form-alert" role="alert" style={{ marginBottom: '1rem', borderColor: '#10B981', background: 'rgba(16, 185, 129, 0.1)', color: '#065F46' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{paySuccessMessage}</span>
              </div>
            )}

            {/* Amount Summary Card */}
            <div
              style={{
                background: 'rgba(11, 61, 145, 0.04)',
                border: '1px solid rgba(11, 61, 145, 0.12)',
                borderRadius: '16px',
                padding: '1.15rem 1.25rem',
                marginBottom: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Fee Payable
                </span>
                <p style={{ margin: '0.1rem 0 0', fontSize: '1.55rem', fontWeight: 800, color: '#065F46' }}>
                  {formatFeeCurrency(feeInfo.fee.amount)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="cbts-dept-badge" style={{ background: 'rgba(11, 61, 145, 0.08)', color: 'var(--primary-navy)' }}>
                  Bus {feeInfo.bus?.busNumber}
                </span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-dark-muted)' }}>
                  Due: {formatFeeDate(feeInfo.fee.dueDate)}
                </p>
              </div>
            </div>

            {/* Active UPI QR Display */}
            {feeInfo.upiQr?.isConfigured && feeInfo.upiQr?.upiQrImage ? (
              <div
                style={{
                  background: 'rgba(11, 61, 145, 0.03)',
                  border: '1.5px solid rgba(11, 61, 145, 0.12)',
                  borderRadius: '18px',
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                  textAlign: 'center',
                }}
              >
                <p style={{ margin: '0 0 0.85rem 0', fontWeight: 700, color: 'var(--primary-navy)', fontSize: '0.9rem' }}>
                  Scan this QR using Google Pay / PhonePe / Paytm or any UPI app.
                </p>

                <div
                  style={{
                    background: '#ffffff',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    display: 'inline-block',
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}
                >
                  <img
                    src={feeInfo.upiQr.upiQrImage}
                    alt="Official College Bus Fee UPI QR"
                    style={{
                      width: '180px',
                      height: '180px',
                      objectFit: 'contain',
                      display: 'block',
                      borderRadius: '6px',
                    }}
                  />
                </div>

                {feeInfo.upiQr.upiName && (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark-primary)' }}>
                    {feeInfo.upiQr.upiName}
                  </p>
                )}

                {feeInfo.upiQr.upiId && (
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-dark-muted)', fontFamily: 'monospace' }}>
                    UPI ID: {feeInfo.upiQr.upiId}
                  </p>
                )}
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1.5px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  marginBottom: '1.25rem',
                  textAlign: 'center',
                  color: '#991B1B',
                }}
              >
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.92rem' }}>
                  UPI payment QR is not configured yet. Please contact the administrator.
                </p>
              </div>
            )}

            {/* UPI UTR Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="cbts-form-label" style={{ fontSize: '0.85rem' }}>
                UPI Transaction ID / UTR Number <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                value={studentUtr}
                onChange={(e) => setStudentUtr(e.target.value)}
                className="cbts-form-input"
                style={{ fontSize: '0.92rem', padding: '0.65rem 0.85rem' }}
                placeholder="e.g. 423984719284 or UPI Ref No"
                disabled={!feeInfo.upiQr?.isConfigured || payProcessing}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)', marginTop: '0.35rem', display: 'block' }}>
                Enter the 12-digit UPI reference / UTR number from your successful payment receipt.
              </span>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="cbts-btn cbts-btn-secondary"
                onClick={() => setPayModalOpen(false)}
                disabled={payProcessing}
                style={{ padding: '0.65rem 1.25rem' }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="cbts-btn cbts-btn-primary"
                onClick={handleProcessPayment}
                disabled={payProcessing || !studentUtr.trim() || !feeInfo.upiQr?.isConfigured}
                style={{
                  padding: '0.65rem 1.75rem',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                }}
              >
                {payProcessing ? 'Confirming Payment...' : 'Payment Completed'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default StudentDashboard;

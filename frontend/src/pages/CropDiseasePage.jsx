import { useState, useRef } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { useNotificationContext } from '../components/Notification';
import { 
  Scan, Camera, Upload, CheckCircle, AlertTriangle, 
  ShoppingBag, ShieldAlert, Sparkles, RefreshCw, Info 
} from 'lucide-react';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';

export const CropDiseasePage = () => {
  const { addNotification } = useNotificationContext();
  const [crop, setCrop] = useState('TOMATO');
  const [symptoms, setSymptoms] = useState('');
  const [imageSrc, setImageSrc] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target.result);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  // Start Camera
  const startCamera = async () => {
    try {
      setCameraActive(true);
      setResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      addNotification('Could not access camera.', 'error');
      setCameraActive(false);
    }
  };

  // Capture Photo
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImageSrc(dataUrl);

      // Stop camera stream
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setCameraActive(false);
    }
  };

  // Submit scan to backend
  const handleScan = async () => {
    if (!imageSrc) {
      addNotification('Please capture or upload an image first.', 'warning');
      return;
    }

    try {
      setScanning(true);
      const payload = {
        image: imageSrc,
        cropName: crop,
        symptoms,
      };

      const res = await api.post('/crop-disease/scan', payload);
      setResult(res.data);
      addNotification('Crop leaf analysis completed.', 'success');
    } catch (err) {
      console.error(err);
      addNotification('AI scan failed. Please try again.', 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleReset = () => {
    setImageSrc(null);
    setResult(null);
    setSymptoms('');
    if (cameraActive) {
      const video = videoRef.current;
      const stream = video?.srcObject;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setCameraActive(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Scan className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                AI Crop Disease Detection
              </h1>
              <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                Scan leaf images or describe symptoms to identify diseases and deficiencies.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Capture/Upload Panel */}
            <div className="xl:col-span-5 flex flex-col gap-6">
              <div className="card">
                <h2 className="text-xl font-bold mb-4">Leaf Capture</h2>
                <div className="space-y-4">
                  {/* Camera view or static image preview */}
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
                    {cameraActive ? (
                      <>
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <button 
                          onClick={capturePhoto} 
                          className="absolute bottom-4 left-1/2 -translate-x-1/2 btn btn-primary rounded-full w-12 h-12 p-0 flex items-center justify-center shadow-lg"
                        >
                          <Camera className="w-6 h-6" />
                        </button>
                      </>
                    ) : imageSrc ? (
                      <img src={imageSrc} alt="Leaf preview" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center p-6 text-slate-500">
                        <Camera className="w-12 h-12 mx-auto mb-2 text-slate-600" />
                        <p className="text-sm">Camera preview will appear here</p>
                      </div>
                    )}
                  </div>

                  {/* Canvas helper for capture (hidden) */}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Actions buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={startCamera} 
                      disabled={cameraActive}
                      className="btn btn-secondary flex-1 justify-center gap-1.5"
                    >
                      <Camera className="w-4 h-4" />
                      Take Photo
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()} 
                      disabled={cameraActive}
                      className="btn btn-secondary flex-1 justify-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      Upload File
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>

                  {/* Metadata fields */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-sm font-medium mb-1 font-semibold">Select Crop</label>
                      <select 
                        value={crop} 
                        onChange={(e) => setCrop(e.target.value)} 
                        className="input"
                      >
                        <option value="TOMATO">Tomato</option>
                        <option value="COTTON">Cotton</option>
                        <option value="PADDY">Paddy (Rice)</option>
                        <option value="WHEAT">Wheat</option>
                        <option value="MAIZE">Maize</option>
                        <option value="CHILLI">Chilli</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 font-semibold">Symptom Notes (Optional)</label>
                      <textarea
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        placeholder="Describe leaves e.g. yellow spots, curling edges, white spots..."
                        className="input min-h-[70px] text-sm"
                      />
                    </div>
                  </div>

                  {/* Scan trigger */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleScan}
                      disabled={scanning || !imageSrc}
                      className="btn btn-primary flex-1 justify-center gap-1.5"
                    >
                      {scanning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Analyzing leaf...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Analyze Leaf
                        </>
                      )}
                    </button>
                    {imageSrc && (
                      <button onClick={handleReset} className="btn btn-secondary p-2.5">
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div className="xl:col-span-7">
              {result ? (
                <div className="card flex flex-col gap-6">
                  {/* Diagnosis summary header */}
                  <div className="flex flex-wrap justify-between items-start gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-gray-100">
                          {result.analysis.diseaseName}
                        </h2>
                        <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200/50 text-[10px] font-bold">
                          {Math.round(result.analysis.confidence * 100)}% Match
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Diagnosis completed for crop: <span className="font-semibold">{result.analysis.cropName}</span>.
                      </p>
                    </div>
                  </div>

                  {/* Cause & Prevention Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl text-xs">
                      <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">Potential Cause</p>
                      <p className="text-slate-700 dark:text-gray-300 leading-relaxed">
                        {result.analysis.cause}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl text-xs">
                      <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">Remediation & Prevention</p>
                      <p className="text-slate-700 dark:text-gray-300 leading-relaxed">
                        {result.analysis.prevention}
                      </p>
                    </div>
                  </div>

                  {/* Deficiencies alerts */}
                  {result.analysis.nutrientDeficiency !== 'None' && (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border border-amber-200/50 text-xs">
                      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Nutrient Deficiency Identified</p>
                        <p className="opacity-95 mt-0.5">
                          Soil is showing signs of: <span className="font-bold">{result.analysis.nutrientDeficiency}</span>. Consider applying soil supplements or matching fertilizers.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recommended Chemicals and Stock Matches */}
                  <div className="space-y-4 pt-2">
                    <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Treatment Recommendations</h3>
                    
                    {/* Pesticides matched */}
                    {result.analysis.recommendedPesticide && result.analysis.recommendedPesticide !== 'None' && (
                      <div className="p-4 border border-slate-200 dark:border-gray-800 rounded-xl">
                        <span className="text-xs font-bold text-slate-500">Pesticide Recommendation: {result.analysis.recommendedPesticide}</span>
                        
                        <div className="mt-3 space-y-2">
                          {result.inventoryMatches.pesticides?.length > 0 ? (
                            result.inventoryMatches.pesticides.map((prod) => (
                              <div key={prod.id} className="flex justify-between items-center bg-emerald-50/30 dark:bg-emerald-950/10 p-2.5 rounded-lg border border-emerald-100/50 dark:border-emerald-900/10 text-xs">
                                <div>
                                  <p className="font-bold text-slate-800 dark:text-gray-200">{prod.name}</p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">In Stock: {prod.stockQuantity} available</p>
                                </div>
                                <span className="font-bold text-slate-700 dark:text-gray-300">{formatCurrency(prod.pricePerUnit)}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-1.5 rounded border border-amber-200/50 flex items-center gap-1.5">
                              <Info className="w-4 h-4" />
                              No exact matching brand in stock. Consider ordering a general brand containing these active ingredients.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Fungicides matched */}
                    {result.analysis.recommendedFungicide && result.analysis.recommendedFungicide !== 'None' && (
                      <div className="p-4 border border-slate-200 dark:border-gray-800 rounded-xl">
                        <span className="text-xs font-bold text-slate-500">Fungicide Recommendation: {result.analysis.recommendedFungicide}</span>
                        
                        <div className="mt-3 space-y-2">
                          {result.inventoryMatches.fungicides?.length > 0 ? (
                            result.inventoryMatches.fungicides.map((prod) => (
                              <div key={prod.id} className="flex justify-between items-center bg-emerald-50/30 dark:bg-emerald-950/10 p-2.5 rounded-lg border border-emerald-100/50 dark:border-emerald-900/10 text-xs">
                                <div>
                                  <p className="font-bold text-slate-800 dark:text-gray-200">{prod.name}</p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">In Stock: {prod.stockQuantity} available</p>
                                </div>
                                <span className="font-bold text-slate-700 dark:text-gray-300">{formatCurrency(prod.pricePerUnit)}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-1.5 rounded border border-amber-200/50 flex items-center gap-1.5">
                              <Info className="w-4 h-4" />
                              No exact matching brand in stock. Consider ordering a general brand containing these active ingredients.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="card flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
                  <Scan className="w-16 h-16 text-slate-300 mb-4" strokeWidth={1} />
                  <h2 className="text-xl font-bold mb-1 font-bold">No diagnosis completed</h2>
                  <p className="text-sm text-gray-500 max-w-sm">
                    Capture or upload a photo of the crop leaf and select the crop, then click Analyze Leaf to generate diagnosis.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

'use client';
import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Detecta se tem câmera disponível
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraAvailable(false);
      return;
    }

    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const hasCamera = devices.some((d) => d.kind === 'videoinput');
      setCameraAvailable(hasCamera);
    });
  }, []);

  const startCamera = async () => {
    setError('');
    setResult(null);
    setCapturedImage(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(mediaStream);
    } catch (err) {
      setError('Não foi possível acessar a câmera. Use "Escolher Arquivo".');
    }
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Função genérica de compressão (usada tanto pra câmera quanto pra arquivo)
  const compressToBlob = (imgSource: HTMLImageElement | HTMLVideoElement): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);

      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      canvas.width = 640;
      canvas.height = 480;
      ctx.drawImage(imgSource, 0, 0, 640, 480);

      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.6);
    });
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const blob = await compressToBlob(videoRef.current);
    if (!blob) {
      setError('Falha ao capturar.');
      return;
    }
    setCapturedBlob(blob);
    setCapturedImage(canvasRef.current?.toDataURL('image/jpeg', 0.6) || null);
    stopCamera();
  };

  // Upload de arquivo (PC ou fallback do celular)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setResult(null);

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      const blob = await compressToBlob(img);
      URL.revokeObjectURL(url);

      if (!blob) {
        setError('Falha ao processar imagem.');
        return;
      }

      setCapturedBlob(blob);
      const previewCanvas = canvasRef.current;
      setCapturedImage(previewCanvas?.toDataURL('image/jpeg', 0.6) || null);
    };
    img.onerror = () => setError('Arquivo de imagem inválido.');
    img.src = url;
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  const analyze = async () => {
    if (!capturedBlob) return;
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', capturedBlob, 'foto.jpg');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/reports/analyze`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Falha no servidor');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('Erro de conexão. Verifique o backend.');
    } finally {
      setLoading(false);
    }
  };

  const sendToOrgao = () => {
    if (!result) return;
    const subject = `[URGÊNCIA ${result.urgencia.toUpperCase()}] ${result.tipo_problema.replace(/_/g, ' ')}`;
    const body = `ID: ${result.id}\nDescrição: ${result.descricao_tecnica}\nRisco: ${result.risco_se_nao_resolvido}`;
    window.location.href = `mailto:${result.email_sugerido}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const reset = () => {
    setResult(null);
    setCapturedImage(null);
    setCapturedBlob(null);
    setError('');
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      <div className="max-w-md w-full space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold mb-2">🏛️ Voz Ativa</h1>
          <p className="text-gray-400">Relatório técnico instantâneo</p>
        </header>

        {/* Tela inicial: mostra opções */}
        {!stream && !capturedImage && !result && (
          <div className="space-y-3">
            {/* Botão câmera (só se disponível) */}
            {cameraAvailable && (
              <button
                onClick={startCamera}
                className="w-full bg-blue-600 hover:bg-blue-700 p-5 rounded-xl font-bold shadow-lg transition text-lg"
              >
                📸 Abrir Câmera
              </button>
            )}

            {/* Botão upload (sempre disponível) */}
            <label className="block w-full cursor-pointer bg-gray-700 hover:bg-gray-600 p-5 rounded-xl text-center font-bold shadow-lg transition text-lg">
              📁 Escolher Arquivo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {cameraAvailable === false && (
              <p className="text-yellow-400 text-sm text-center">
                ℹ️ Câmera não detectada. Use "Escolher Arquivo".
              </p>
            )}
          </div>
        )}

        {/* Câmera ao vivo */}
        {stream && (
          <div className="space-y-4">
            <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl border-2 border-blue-500" />
            <div className="flex gap-2">
              <button onClick={capturePhoto} className="flex-1 bg-green-600 hover:bg-green-700 p-4 rounded-xl font-bold">
                📷 Capturar
              </button>
              <button onClick={stopCamera} className="flex-1 bg-red-600 hover:bg-red-700 p-4 rounded-xl font-bold">
                ✖ Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Foto pronta */}
        {capturedImage && !result && (
          <div className="space-y-4">
            <img src={capturedImage} alt="Foto" className="w-full rounded-xl border-2 border-gray-700" />
            <button
              onClick={analyze}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-xl font-bold disabled:opacity-50 transition"
            >
              {loading ? '⏳ Analisando...' : '🔍 Gerar Relatório Técnico'}
            </button>
            <button onClick={reset} className="w-full bg-gray-700 hover:bg-gray-600 p-3 rounded-xl font-bold">
              🔄 Nova Foto
            </button>
          </div>
        )}

        {error && <div className="bg-red-900/50 border border-red-500 p-4 rounded-xl text-center text-red-200">❌ {error}</div>}

        {/* Resultado */}
        {result && (
          <div className="bg-gray-800 p-6 rounded-xl space-y-4 border border-gray-700 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
              <h2 className="text-lg font-bold capitalize">{result.tipo_problema.replace(/_/g, ' ')}</h2>
              <span className="bg-red-600 px-3 py-1 rounded-full text-xs font-bold">{result.urgencia.toUpperCase()}</span>
            </div>
            <div className="space-y-3 text-sm text-gray-300">
              <p><strong className="text-white">🏢 Órgão:</strong> {result.orgao_responsavel}</p>
              <p><strong className="text-white">📝 Laudo:</strong> {result.descricao_tecnica}</p>
              <p className="text-red-400"><strong>⚠️ Risco:</strong> {result.risco_se_nao_resolvido}</p>
              <p className="text-xs text-gray-500 font-mono">Protocolo: {result.id}</p>
            </div>
            <button onClick={sendToOrgao} className="w-full bg-purple-600 hover:bg-purple-700 p-4 rounded-xl font-bold">
              📧 Enviar ao Órgão
            </button>
            <button onClick={reset} className="w-full bg-gray-700 hover:bg-gray-600 p-3 rounded-xl font-bold">
              📸 Nova Denúncia
            </button>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </main>
  );
}
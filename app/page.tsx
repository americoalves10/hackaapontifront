'use client';
import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Inicia a câmera com resolução controlada
  const startCamera = async () => {
    setCameraError('');
    setError('');
    setResult(null);
    setCapturedImage(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Câmera traseira
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
    } catch (err: any) {
      setCameraError('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  };

  // Mostra o vídeo quando o stream está pronto
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Captura o frame e comprime
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Define resolução baixa (640x480) para evitar estouro de memória
    canvas.width = 640;
    canvas.height = 480;

    // Desenha o frame do vídeo no canvas
    ctx.drawImage(video, 0, 0, 640, 480);

    // Converte para JPEG com qualidade 60% (gera ~30-50KB)
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Falha ao capturar a foto.');
          return;
        }
        setCapturedBlob(blob);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.6));
        stopCamera(); // Fecha a câmera após capturar
      },
      'image/jpeg',
      0.6
    );
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
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
      const res = await fetch(`${apiUrl}/reports/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Falha no servidor');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('Erro de conexão. Verifique se o backend está rodando.');
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

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      <div className="max-w-md w-full space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold mb-2">🏛️ Voz Ativa</h1>
          <p className="text-gray-400">Relatório técnico instantâneo</p>
        </header>

        {/* Câmera ao vivo */}
        {!stream && !capturedImage && !result && (
          <button
            onClick={startCamera}
            className="w-full bg-blue-600 hover:bg-blue-700 p-6 rounded-xl font-bold shadow-lg transition text-lg"
          >
            📸 Abrir Câmera
          </button>
        )}

        {stream && (
          <div className="space-y-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-xl border-2 border-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={capturePhoto}
                className="flex-1 bg-green-600 hover:bg-green-700 p-4 rounded-xl font-bold transition"
              >
                📷 Capturar Foto
              </button>
              <button
                onClick={stopCamera}
                className="flex-1 bg-red-600 hover:bg-red-700 p-4 rounded-xl font-bold transition"
              >
                ✖ Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Foto capturada */}
        {capturedImage && !result && (
          <div className="space-y-4">
            <img
              src={capturedImage}
              alt="Foto capturada"
              className="w-full rounded-xl border-2 border-gray-700"
            />
            <button
              onClick={analyze}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-xl font-bold disabled:opacity-50 transition"
            >
              {loading ? '⏳ Processando...' : '🔍 Gerar Relatório Técnico'}
            </button>
            <button
              onClick={() => {
                setCapturedImage(null);
                setCapturedBlob(null);
                startCamera();
              }}
              className="w-full bg-gray-700 hover:bg-gray-600 p-3 rounded-xl font-bold transition"
            >
              🔄 Tirar Outra Foto
            </button>
          </div>
        )}

        {cameraError && (
          <div className="bg-red-900/50 border border-red-500 p-4 rounded-xl text-center text-red-200">
            ❌ {cameraError}
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-500 p-4 rounded-xl text-center text-red-200">
            ❌ {error}
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div className="bg-gray-800 p-6 rounded-xl space-y-4 border border-gray-700 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
              <h2 className="text-lg font-bold capitalize text-white">
                {result.tipo_problema.replace(/_/g, ' ')}
              </h2>
              <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                {result.urgencia.toUpperCase()}
              </span>
            </div>

            <div className="space-y-3 text-sm text-gray-300">
              <p>
                <strong className="text-white">🏢 Órgão:</strong> {result.orgao_responsavel}
              </p>
              <p>
                <strong className="text-white">📝 Laudo:</strong> {result.descricao_tecnica}
              </p>
              <p className="text-red-400">
                <strong>⚠️ Risco:</strong> {result.risco_se_nao_resolvido}
              </p>
              <p className="text-xs text-gray-500 font-mono">Protocolo: {result.id}</p>
            </div>

            <button
              onClick={sendToOrgao}
              className="w-full bg-purple-600 hover:bg-purple-700 p-4 rounded-xl font-bold transition mt-2"
            >
              📧 Enviar ao Órgão
            </button>

            <button
              onClick={() => {
                setResult(null);
                setCapturedImage(null);
                setCapturedBlob(null);
              }}
              className="w-full bg-gray-700 hover:bg-gray-600 p-3 rounded-xl font-bold transition"
            >
              📸 Nova Denúncia
            </button>
          </div>
        )}

        {/* Canvas oculto para processamento */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </main>
  );
}
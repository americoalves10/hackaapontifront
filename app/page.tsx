'use client';
import { useState } from 'react';
import axios from 'axios';

interface Analysis {
  tipo_problema: string;
  urgencia: string;
  orgao_responsavel: string;
  descricao_tecnica: string;
  risco_se_nao_resolvido: string;
  email_sugerido: string;
  timestamp: string;
  id: string;
}

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 400;
            const MAX_HEIGHT = 400;
            
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
              if (width > MAX_WIDTH) {
                height = (height * MAX_WIDTH) / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = (width * MAX_HEIGHT) / height;
                height = MAX_HEIGHT;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Não foi possível criar contexto do canvas'));
              return;
            }
            
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Falha ao comprimir imagem'));
                  return;
                }
                resolve(new File([blob], "compressed.jpg", { type: "image/jpeg" }));
              },
              "image/jpeg",
              0.4
            );
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('Falha ao carregar imagem'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setCompressionInfo(null);
    
    try {
      const originalSizeMB = (selectedFile.size / 1024 / 1024).toFixed(2);
      console.log(`📸 Imagem original: ${originalSizeMB}MB`);
      
      const compressedFile = await compressImage(selectedFile);
      const compressedSizeKB = (compressedFile.size / 1024).toFixed(2);
      console.log(`✅ Imagem comprimida: ${compressedSizeKB}KB`);
      
      setCompressionInfo(`Original: ${originalSizeMB}MB → Comprimida: ${compressedSizeKB}KB`);
      
      setFile(compressedFile);
      
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(compressedFile);
      
      setAnalysis(null);
    } catch (err: any) {
      console.error("Erro ao comprimir", err);
      setError(`Erro ao processar a imagem: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const analyzeImage = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      console.log(`📤 Enviando para: ${apiUrl}/reports/analyze`);
      console.log(`📦 Tamanho do payload: ${(file.size / 1024).toFixed(2)}KB`);
      
      const { data } = await axios.post(`${apiUrl}/reports/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      setAnalysis(data);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'ECONNABORTED') {
        setError('Tempo esgotado. Tente novamente.');
      } else if (err.response?.status === 500) {
        setError('Erro no servidor. Tente uma foto menor.');
      } else if (err.response?.status === 413) {
        setError('Imagem muito grande. Tente outra foto.');
      } else {
        setError('Erro ao analisar. Verifique a conexão.');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendToOrgao = () => {
    if (!analysis) return;
    const subject = `[URGÊNCIA ${analysis.urgencia.toUpperCase()}] ${analysis.tipo_problema.replace(/_/g, ' ')}`;
    const body = `Descrição técnica:\n${analysis.descricao_tecnica}\n\nRisco se não resolvido:\n${analysis.risco_se_nao_resolvido}\n\nÓrgão responsável: ${analysis.orgao_responsavel}\n\nID do chamado: ${analysis.id}`;
    window.location.href = `mailto:${analysis.email_sugerido}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-5xl font-bold mb-2">🏛️ Voz Ativa</h1>
          <p className="text-gray-400 text-lg">A IA que transforma sua foto em ação</p>
        </header>

        <div className="space-y-6">
          <label className="block cursor-pointer bg-blue-600 hover:bg-blue-700 transition p-6 rounded-xl text-center text-lg font-semibold shadow-lg">
            📸 Tirar Foto do Problema
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handleImageChange} 
              className="hidden" 
            />
          </label>

          {compressionInfo && (
            <div className="bg-green-900/50 border border-green-500 p-3 rounded-xl text-center">
              <p className="text-green-200 text-sm">✅ {compressionInfo}</p>
            </div>
          )}

          {image && (
            <>
              <img src={image} alt="Preview" className="rounded-xl w-full shadow-2xl" />
              <button
                onClick={analyzeImage}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 p-5 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
              >
                {loading ? '🤖 IA analisando...' : '🔍 Analisar com IA'}
              </button>
            </>
          )}

          {error && (
            <div className="bg-red-900/50 border border-red-500 p-4 rounded-xl">
              <p className="text-red-200">❌ {error}</p>
            </div>
          )}

          {analysis && (
            <div className="bg-gray-800/80 backdrop-blur p-6 rounded-xl space-y-4 shadow-2xl border border-gray-700">
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold capitalize">
                  {analysis.tipo_problema.replace(/_/g, ' ')}
                </h2>
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                  analysis.urgencia === 'critico' ? 'bg-red-600' :
                  analysis.urgencia === 'alto' ? 'bg-orange-600' :
                  analysis.urgencia === 'medio' ? 'bg-yellow-600 text-black' : 'bg-green-600'
                }`}>
                  {analysis.urgencia.toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-3 text-gray-300">
                <p><strong className="text-white">🏢 Órgão:</strong> {analysis.orgao_responsavel}</p>
                <p><strong className="text-white">📝 Descrição técnica:</strong> {analysis.descricao_tecnica}</p>
                <p className="text-red-400"><strong>⚠️ Risco:</strong> {analysis.risco_se_nao_resolvido}</p>
                <p className="text-xs text-gray-500">ID: {analysis.id}</p>
              </div>
              
              <button
                onClick={sendToOrgao}
                className="w-full bg-purple-600 hover:bg-purple-700 p-5 rounded-xl font-bold text-lg transition shadow-lg"
              >
                📧 Enviar ao Órgão Responsável
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
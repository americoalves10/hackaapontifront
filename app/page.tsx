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

    // ✨ NOVA FUNÇÃO: Comprime a imagem no navegador antes de enviar
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Reduz para 800px (suficiente para a IA)
          const scaleSize = MAX_WIDTH / img.width;
          
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Converte para JPEG com 70% de qualidade (reduz de ~10MB para ~100KB)
          canvas.toBlob(
            (blob) => {
              resolve(new File([blob!], "compressed_image.jpg", { type: "image/jpeg" }));
            },
            "image/jpeg",
            0.7
          );
        };
      };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setLoading(true); // Mostra carregamento durante a compressão
    
    try {
      // 1. Comprime a imagem
      const compressedFile = await compressImage(selectedFile);
      console.log(`📉 Imagem comprimida de ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB para ${(compressedFile.size / 1024).toFixed(2)}KB`);
      
      // 2. Atualiza o estado com a imagem leve
      setFile(compressedFile);
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(compressedFile);
      
      setAnalysis(null);
      setError(null);
    } catch (err) {
      console.error("Erro ao comprimir imagem", err);
      setError("Erro ao processar a imagem. Tente outra.");
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
      const { data } = await axios.post(`${apiUrl}/reports/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAnalysis(data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Erro ao analisar. Verifique se o backend está rodando.');
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
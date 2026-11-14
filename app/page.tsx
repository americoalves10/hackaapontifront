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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setAnalysis(null);
    
    // Apenas uma validação leve de tamanho (limite de 15MB, suficiente para qualquer celular)
    if (selectedFile.size > 15 * 1024 * 1024) {
      setError('Foto muito grande. Tente aproximar o celular do objeto.');
      return;
      }
    
    setFile(selectedFile);
    
    // URL.createObjectURL é APENAS um ponteiro. NÃO carrega a imagem na memória do JS.
    // É super leve e funciona perfeitamente no mobile.
    const previewUrl = URL.createObjectURL(selectedFile);
    setImageUrl(previewUrl);
  };

  const analyzeImage = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    // Envia o arquivo cru. O backend vai cuidar de comprimir com segurança.
    formData.append('image', file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const { data } = await axios.post(`${apiUrl}/reports/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // 30 segundos
      });
      setAnalysis(data);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'ECONNABORTED') {
        setError('Tempo esgotado. Verifique sua conexão.');
      } else {
        setError('Erro ao analisar. Tente tirar a foto novamente.');
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
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">🏛️ Voz Ativa</h1>
          <p className="text-gray-400">Tire uma foto e a IA gera o relatório técnico</p>
        </header>

        <div className="space-y-6">
          {/* capture="environment" força a abertura da câmera traseira no celular */}
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

          {imageUrl && (
            <>
              <img src={imageUrl} alt="Preview" className="rounded-xl w-full shadow-2xl max-h-96 object-cover" />
              <button
                onClick={analyzeImage}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 p-5 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
              >
                {loading ? '🤖 Processando no servidor...' : '🔍 Analisar com IA'}
              </button>
            </>
          )}

          {error && (
            <div className="bg-red-900/50 border border-red-500 p-4 rounded-xl">
              <p className="text-red-200 text-center">❌ {error}</p>
            </div>
          )}

          {analysis && (
            <div className="bg-gray-800/80 backdrop-blur p-6 rounded-xl space-y-4 shadow-2xl border border-gray-700">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold capitalize text-white">
                  {analysis.tipo_problema.replace(/_/g, ' ')}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  analysis.urgencia === 'critico' ? 'bg-red-600' :
                  analysis.urgencia === 'alto' ? 'bg-orange-600' :
                  analysis.urgencia === 'medio' ? 'bg-yellow-600 text-black' : 'bg-green-600'
                }`}>
                  {analysis.urgencia.toUpperCase()}
                </span>
                </div>
              
              <div className="space-y-3 text-sm text-gray-300">
                <p><strong className="text-white">🏢 Órgão:</strong> {analysis.orgao_responsavel}</p>
                <p><strong className="text-white">📝 Descrição:</strong> {analysis.descricao_tecnica}</p>
                <p className="text-red-400"><strong>⚠️ Risco:</strong> {analysis.risco_se_nao_resolvido}</p>
              </div>
              
              <button
                onClick={sendToOrgao}
                className="w-full bg-purple-600 hover:bg-purple-700 p-4 rounded-xl font-bold text-base transition shadow-lg mt-4"
              >
                📧 Enviar Relatório ao Órgão
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
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
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setAnalysis(null);
    
    // Validação leve
    if (selectedFile.size > 20 * 1024 * 1024) {
      setError('Foto muito grande. Tente aproximar o celular do objeto.');
      return;
    }
    
    setFile(selectedFile);
    console.log(`📸 Foto selecionada: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`);
  };

  const analyzeImage = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      console.log('📤 Enviando foto para o servidor...');
      
      const { data } = await axios.post(`${apiUrl}/reports/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      
      console.log('✅ Análise recebida:', data);
      setAnalysis(data);
    } catch (err: any) {
      console.error('❌ Erro:', err);
      if (err.code === 'ECONNABORTED') {
        setError('Tempo esgotado. Verifique sua conexão.');
      } else if (err.response?.status === 413) {
        setError('Foto muito grande para o servidor.');
      } else {
        setError('Erro ao analisar. Tente novamente.');
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

          {file && (
            <div className="bg-green-900/50 border border-green-500 p-4 rounded-xl text-center">
              <p className="text-green-200 font-semibold">✅ Foto selecionada!</p>
              <p className="text-green-300 text-sm">Tamanho: {(file.size / 1024 / 1024).toFixed(2)}MB</p>
              <button
                onClick={analyzeImage}
                disabled={loading}
                className="w-full mt-4 bg-green-600 hover:bg-green-700 p-5 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
              >
                {loading ? '🤖 Processando no servidor...' : '🔍 Analisar com IA'}
              </button>
            </div>
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
'use client';
import { useState } from 'react';

export default function Home() {
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setResult(null);
      setError('');
    }
  };

  const analyze = async () => {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (!fileInput.files?.[0]) return;

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    try {
      // Usa o backend local para garantir que funcione sem depender de internet/Vercel agora
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/reports/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Falha no servidor');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('Erro de conexão. Verifique se o backend (localhost:3001) está rodando.');
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

        <label className="block cursor-pointer bg-blue-600 hover:bg-blue-700 p-6 rounded-xl text-center font-bold shadow-lg transition">
          📸 Selecionar Foto
          <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
        </label>

        {fileName && !result && (
          <div className="bg-gray-800 p-4 rounded-xl text-center border border-gray-700">
            <p className="text-green-400 mb-4">✅ {fileName}</p>
            <button
              onClick={analyze}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-xl font-bold disabled:opacity-50 transition"
            >
              {loading ? '⏳ Processando...' : '🔍 Gerar Relatório Técnico'}
            </button>
          </div>
        )}

        {error && <div className="bg-red-900/50 border border-red-500 p-4 rounded-xl text-center text-red-200">❌ {error}</div>}

        {result && (
          <div className="bg-gray-800 p-6 rounded-xl space-y-4 border border-gray-700 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
              <h2 className="text-lg font-bold capitalize text-white">{result.tipo_problema.replace(/_/g, ' ')}</h2>
              <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">{result.urgencia.toUpperCase()}</span>
            </div>
            
            <div className="space-y-3 text-sm text-gray-300">
              <p><strong className="text-white">🏢 Órgão:</strong> {result.orgao_responsavel}</p>
              <p><strong className="text-white">📝 Laudo:</strong> {result.descricao_tecnica}</p>
              <p className="text-red-400"><strong>⚠️ Risco:</strong> {result.risco_se_nao_resolvido}</p>
              <p className="text-xs text-gray-500 font-mono">Protocolo: {result.id}</p>
            </div>
            
            <button onClick={sendToOrgao} className="w-full bg-purple-600 hover:bg-purple-700 p-4 rounded-xl font-bold transition mt-2">
              📧 Enviar ao Órgão
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
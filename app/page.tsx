import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })

  const env = process.env.NODE_ENV

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-10">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            👋 Hello World!
          </h1>
          <p className="text-gray-500 text-sm">
            Ambiente:{' '}
            <span className={`font-semibold ${env === 'production' ? 'text-green-600' : 'text-blue-600'}`}>
              {env === 'production' ? '🟢 Production' : '🔵 Development'}
            </span>
          </p>
        </div>

        {/* Contenuto */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            ❌ Errore Supabase: {error.message}
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              📨 Messaggi dal database:
            </h2>
            {messages && messages.length > 0 ? (
              <ul className="space-y-3">
                {messages.map((msg) => (
                  <li key={msg.id} className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <p className="text-gray-800">{msg.text}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(msg.created_at).toLocaleString('it-IT')}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 italic">Nessun messaggio trovato.</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          Next.js + Supabase + Vercel — Stack completo ✅
        </div>
      </div>
    </main>
  )
}
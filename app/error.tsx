'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <h2 className="text-2xl font-bold text-red-600 mb-4">Qualcosa è andato storto!</h2>
      <p className="text-gray-600 mb-6">{error.message}</p>
      <button
        onClick={() => reset()} // Prova a ricaricare solo il componente fallito
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Riprova
      </button>
    </div>
  );
}
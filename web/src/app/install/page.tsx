import { Download, Smartphone } from "lucide-react";

export default function InstallPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/15">
          <Smartphone size={28} className="text-blue-400" />
        </div>
        <h1 className="text-xl font-semibold text-white">KBS Main Courante</h1>
        <p className="mt-1 text-sm text-slate-400">
          Application mobile pour les agents et dirigeants
        </p>

        <a
          href="/kbs-dispatch.apk"
          download
          className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500"
        >
          <Download size={16} />
          Télécharger l&apos;application (Android)
        </a>

        <div className="mt-6 space-y-2 text-left text-xs text-slate-500">
          <p className="font-medium text-slate-400">Installation :</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>Téléchargez le fichier ci-dessus depuis votre téléphone.</li>
            <li>
              Ouvrez-le une fois téléchargé. Android peut demander d&apos;autoriser
              l&apos;installation depuis cette source — acceptez.
            </li>
            <li>Suivez les instructions à l&apos;écran pour terminer l&apos;installation.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
